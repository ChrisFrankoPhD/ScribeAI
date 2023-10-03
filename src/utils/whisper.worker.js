import { pipeline } from "@xenova/transformers";
import { MessageTypes } from "./presets.js";

// here we are defining a singleton class that creates our pipeline for us
class MyTranscriptionPipeline {
    // define the task and model we want this pipeline to use
    static task = 'automatic-speech-recognition';
    static model = 'Xenova/whisper-tiny.en';

    // here we define an instance "flag", ensures we are only going to have a single instance of the pipeline 
    static instance = null;
    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            // create the pipeline 
            this.instance = await pipeline(this.task, this.model, { progress_callback })
        }
        return this.instance
    }   
}

// we are adding an event listener to our worker that is going to listen for a message from the App, and specifically if the type of message is defined as an inference_request, we are going to call the transcribe function on the corresponding audio
self.addEventListener('message', async (e) => {
    const {type, audio} = e.data;
    if (type === MessageTypes.INFERENCE_REQUEST) {
        await transcribe(audio)
    }
})

// this is the actual transcribe function, does all the work
async function transcribe(audio) {
    // first thing we do is send a loading response back to App
    sendLoadingMessage('LOADING')

    //  make an instance of our pipeline class defined above
    let pipeline
    try {
        // construct the instance, and give it a callback function
        pipeline = await MyTranscriptionPipeline.getInstance(loading_callback);

    } catch (err) {
        console.log(`error in transcribe try/catch: ${err.message}`);
    }
    sendLoadingMessage('LOADED')

    // we will choose a stride length for our model, we use 0 for now
    const stride_length_s = 0;
    const generationTracker = new GenerationTracker(pipeline, stride_length_s)
    
    // so this is the actual call of the ML/AI pipeline we loaded, giving it the audio file to transcribe
    let test = await pipeline(audio, {
        // we do not want to use top_k encoding, or any sampling encoding
        top_k: 0,
        do_sample: false,
        // we want to split long audio into many smaller chunks
        chunk_length_s: 30,
        // overlap at edge of each chunk, defined above
        stride_length_s,
        // we want timestamps on our transcribed audio
        return_timestamps: true,
        // this function is called for each token generated
        callback_function: generationTracker.callbackFunction.bind(generationTracker),
        // this callback function will be called after each chunk is processed
        chunk_callback: generationTracker.chunkCallback.bind(generationTracker),
    });
    generationTracker.sendFinalResult()
}

// so this is the callback we are providing our pipeline, gives us incremental updates on the loading of the model
async function loading_callback(data) {
    self.postMessage(data)
}

// we simply post a message saying loading back to App.
function sendLoadingMessage(status) {
    self.postMessage({
        type: MessageTypes.LOADING,
        status
    })
}
// post a message with chunk results to the App
function createResultMessage(result) {
    self.postMessage({
        status: 'CHUNK',
        type: MessageTypes.RESULT,
        result
    })
}
// post a message with partial results to the App
function createPartialResultMessage(result) {
    self.postMessage({
        status: 'PARTIAL',
        type: MessageTypes.RESULT_PARTIAL,
        result
    })
}

// the generation tracker is useful when we have audio that needs to be split up into multiple 30sec chunks. It allows us to get partial results and send updates to the App as data is processed
class GenerationTracker {
    constructor(pipeline, stride_length_s) {
        // holding our pipeline instance
        this.pipeline = pipeline;
        // the stride length is the overlap on each side of the audio chunk
        this.stride_length_s = stride_length_s;
        this.chunks = [];
        // the precision with which the model will analyse the data
        this.time_precision = pipeline?.processor.feature_extractor.config.chunk_length / pipeline.model.config.max_source_positions;
        // this.processed_chunks = [];
    }

    // function to notify App of finished processing
    sendFinalResult() {
        self.postMessage({
            status: 'FINISHED',
            type: MessageTypes.INFERENCE_DONE
        });
    }
    
    // this function is called whenever a new token is predicted by the model, the full text string for the chunk is given (undecoded)
    callbackFunction(beams) {
        const bestBeam = beams[0]
        // decode the returned token, we always get a single result but it is returned in an array
        let text = this.pipeline.tokenizer.decode(bestBeam.output_token_ids, {
            skip_special_tokens: true
        })
    
        const result = {
            text
        }
        // send the partial results message to the App
        createPartialResultMessage(result)
    }

    // this is called with each completed chunk, it includes the finished tokens for the whole chunk at once, instead of 1 token at a time like above
    chunkCallback(data) {
        this.chunks.push(data)
        try {
            // we call a more specific asr (automatic speech recognition) decoder for the chunk
            const decoded_chunk = this.pipeline.tokenizer._decode_asr(
                this.chunks, {
                    // the time precision with which to analyse the audio file
                    time_precision: this.time_precision,
                }
            )
            // trim the decoded text, and place in results object,
            const text = decoded_chunk[0].trim()
            const result = {
                text
            }
            // send the results message to the App
            createResultMessage(
                result, false
            )

        } catch (error) {
            console.warn(`Error in ChunkCallback: \n${error.message}`);
        }
    }
};

