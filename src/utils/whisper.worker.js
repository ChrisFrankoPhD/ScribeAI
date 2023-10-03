import { pipeline } from "@xenova/transformers";
import { MessageTypes } from "./presets.js";

// here we are defining a singleton class that creates our pipeline for us, a pipeline is a simplified way for us to interact with a ML library with huggingface, it abstracts all the complexity of deaing with the model and gives us some nice and easy to use API 
class MyTranscriptionPipeline {
    // we need to define the task we want this pipeline to complete, and the AI model we want it to use
    static task = 'automatic-speech-recognition';
    static model = 'Xenova/whisper-tiny.en';

    // here we define an instance "flag", which hold our actual pipeline instance, this ensures we are only going to have a single instance of the pipeline that will be used for all tasks, we can see that if an instance exists already below we are just going to return the instance that already exists
    static instance = null;
    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            // so here is where we actually create the pipeline with the task and model we defined above, 
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

// this is the actual transcribe function, so this will do the real work here, this is called above by the event listener when App sends this worker an inference request
async function transcribe(audio) {
    // first thing we do is send a loading response back to App, which is its own function defined below
    sendLoadingMessage('LOADING')

    // so now that we have an actual transcribe request, we are going to make an instance of our pipeline class defined above
    let pipeline
    try {
        // construct the instance, and give it a callback function ("loading_callback") which is defined below
        pipeline = await MyTranscriptionPipeline.getInstance(loading_callback);

    } catch (err) {
        console.log(`error in transcribe try/catch: ${err.message}`);
    }
    sendLoadingMessage('LOADED')

    // we will choose a stride length for our model, when we split our audio up into many piece for large files, the stride length is the overlap on the edges of both audio pieces, this is needed for accurate transcribing (https://huggingface.co/blog/asr-chunking)
    const stride_length_s = 0;
    const generationTracker = new GenerationTracker(pipeline, stride_length_s)
    
    // so this is the actual call of the ML/AI pipeline we loaded, we call it with the decoded audio file, and an options list, this takes time but directly returns our data!
    let test = await pipeline(audio, {
        // top_k is a type of decoding by the AI, we can tell the AI to pick the word by randomly sampling (with weighted probability) from the top "k" words in the probability distribution, top_k = 0 means we do not want top_k sampling at all
        top_k: 0,
        // this is also decoding method, here we say we do not want any sampling from the word space, so in other words we always choose the word with the highest probability
        do_sample: false,
        // chunk length is the length of each chunk of audio the model will process, we want to split long audio into many smaller pieces for efficiency
        chunk_length_s: 30,
        // overlap at edge of each chunk, defined above
        stride_length_s,
        // we want timestamps on our transcribed audio
        return_timestamps: true,
        // this function is called for each token generated it seems
        callback_function: generationTracker.callbackFunction.bind(generationTracker),
        // this callback function will be called after each chunk is processed
        chunk_callback: generationTracker.chunkCallback.bind(generationTracker),
    });
    // console.log('pipeline result');
    // console.log(test);
    // console.log('end of result');
    

    // await pipeline(audio, {
    //     top_k: 0,
    //     do_sample: false,
    //     chunk_length_s: 30,
    //     stride_length_s,
    //     return_timestamps: true,
    //     callback_function: generationTracker.callbackFunction.bind(generationTracker),
    //     chunk_callback: generationTracker.chunkCallback.bind(generationTracker)
    // })
    generationTracker.sendFinalResult()
}

// so this is the callback we are providing our pipeline, this will allow the pipeline to use this callback to give us incremental updates on the loading of the model, this is just for the model and not the output
async function loading_callback(data) {
    // so the pipeline will call this with some data, which has a status property, if it is still in progress, loading the model might take some time, so this gives us a way to give a % finished
    self.postMessage(data)
    // const {status} = data;
    // const {file, status, progress, loaded, total} = data
    // sendDownloadingMessage(data)
}
// and this is the corresponding downloading message function for the transcribe function above, and here this just takes the info from the callback and sends it to App
function sendDownloadingMessage(file, progress, loaded, total) {
    self.postMessage({
        type: MessageTypes.DOWNLOADING,
        file,
        progress,
        loaded,
        total
    })
}

// we simply post a message saying loading back to App. (the presets file is just used here so we have a consistent dictionary of all our message types, both sides are always expecting the same values, and if we want to change them we just change it in the file)
function sendLoadingMessage(status) {
    self.postMessage({
        type: MessageTypes.LOADING,
        status
    })
}

function createResultMessage(result) {
    self.postMessage({
        status: 'CHUNK',
        type: MessageTypes.RESULT,
        result
    })
}

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
    
    // this function seems to be called after each additional token has been generated, we see if we print the resulting text output after tokenization decoding, we get a string of text that is built upon by one token each time this is called, until we reach our chunk length, and the whole chunk is returned, then we start over with a new stirng of text that gets built upon for the next chunk
    callbackFunction(beams) {
        // in the analysis, beam search means we completing a breadth first search of the solution tree, while only storing/further exploring a given number of the most promising nodes. BFS is nice since we are less likely to end up with a local maxima result, since we search multiple branches of the solution tree before going deeper, however it is memory intensive. A beam search solves the memory issue by only exploring the most probable branches
        // each of our results as "beams" below only has a single element, since we did not specify a beam search, and frankly i dont think taht would relevant anyway since this is completed results, not possible results to choose from 
        // beams is a bad word here i guess is what im saying
        const bestBeam = beams[0]
        // we call the tokenizer of our pipeline, tokenizing takes text strings and turns them into usable data token for the model, and vice versa, so we are using the tokenizer to decode the resulting returned tokens from the "bestbeam" into usable text
        let text = this.pipeline.tokenizer.decode(bestBeam.output_token_ids, {
            skip_special_tokens: true
        })

        const result = {
            text
        }

        createPartialResultMessage(result)
    }

    // this is called with each completed chunk, it includes the finished tokens for the whole chunk at once, instead of 1 token at a time like above
    chunkCallback(data) {
        this.chunks.push(data)
        try {
            // we call a more specific asr (automatic speech recognition) decoder for the chunk, it takes an array of chunks and returns a single text string for all audio up to the current chunk
            const decoded_chunk = this.pipeline.tokenizer._decode_asr(
                this.chunks, {
                    // the time precision with which to analyse the audio file
                    time_precision: this.time_precision,
                    // return_timestamps: true,
                    // force_full_sequence: false
                }
            )
            // this following is used if we want timestamps on the transcription, however the model was throwing errors when there was cut off speech at the end of recordings
            // this.processed_chunks = decoded_chunk.map((chunk, index) => {
            //     return this.processChunk(chunk, index)
            // })

            // trim the decoded text, and place in results object, the results object can have more properties if we have timestamps, for example
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

