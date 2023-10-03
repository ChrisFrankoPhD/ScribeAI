# ScribeAI
Use machine learning to transcribe and further translate audio in your browser


## Project Notes

- I'd like to use this README as a record of the things I learned along the way while making (and continuing to make) this app. Some of them are trivial but I happened to not use that feature before, and some are more foundational concepts for dealing with machine learning data. 
- There are going to be a number of little typos errors here likely, as I typically jump back and forth between the notes and code while writing, hopefully they are useful If I, or anyone else, come back to this program and wants to mimic or better understand something that is going on. 

### Stack

- we are going to make this Tailwind / Vite for the React front end. Tailwind is a CSS framework that allows us to have customizable fully responsive front ends, and Vite is a local react development server that is quite fast and has a good file system

### TailWind / Vite

- we can set up a tailwind / vite app by following the instructions here: https://tailwindcss.com/docs/guides/vite
- we follow this word for word so I am not going to write it out here
- in general though, we first create a Vite project, then enter that folder and install Tailwind CSS and initialize it
- we then have to add paths in our talwind config file "tailwind.config.js" to our react/Vite template files, which are our base html, index, and js files, this way tailwind can find them
- we then add "directives" our react index.css file, these are little "@" commands like "@tailwind" that tell tailwind to add different groups of classes to our css for use in the html, somewhat similar to how we import a bootstrap CDN and then we can use all of bootstraps classes in our html, this is a different way of getting that functionality that tailwind will do behind the scenes
- now we do "npm run dev" and we see tailwind runs on localhost:5173, and we can just open that in our browser, and mess with our app.jsx file (since thats the base react file) with some tailwind classes, and we see its all working!

### File Uploading

- when making our file upload button, we use the structure:
```
<p className="">
    Or <label className=""> upload <input className="hidden" type="file" accept=".mp3,.wave"/>
    </label> an mp3 from your computer
</p>
```
- so we have text, and the word "upload" acts as our button, and here we are encasing it in a "label" element
    - the label element acts a label for an associated input, so we have an input within our label in this case, and this automatically associates the two
    - we can also have a `for="{input_id}"` attribute in our label, then have the input ourside the label with a id of "input_id"
    - this allows the label to be clicked on to activate the given form, and also is good for screen readers since the label text will be read for the form
    - in our case, when we click upload here, we activate the file input, and we open up a file upload window

### useRef React Hook

- for the audio recording, we are going to use the useRef hook, this allows us to have a state that we can update without rerendering the component, and persist between rerenders as well. 
- so when we are recording audio for example we want to have our audio recorder persist if the component rerenders due to a timer that is incrementing, for example
- to change a useRef state, we have to access the current value of the ref object
- so if we did `counter = useRef(0)`, counter is a ref object and we would have to do `counter.current = counter.current + 1` to update the value

### Navigator.mediaDevices

- accessing the navigator object in javascript allows us to access the user-agents properties, like a clipboard, connection, cookies, and of course the users connected media devices like the audio and video device
- so in our recording device we do:
```
async function startRecording() {
    let tempStream
    console.log('Start Recording');
    try {
        const streamData = navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
        })
    } catch (err) {
        console.log(err.message);
        return
    }
}
```
- so this gets us the users media devices, and it takes a constraint object where we can specify the types of media
    - only audio and video are the possible properties, and we only want to record so we set video to false

### Web Workers

- web workers allow us to run processes on background threads without interfering with the user interface
- for example we can make them run a fetch request in the background, and not have our page or program stalled while waiting for a response like we do when we use `async ... await`
- a specified Worker object can output things back to the JS program through a specified event handler, where the worker will trigger an event for that handler to handle and do what we please with
- we use the `Worker()` constructor to make a new instance, the main argument of a Worker is a URL for a given script to execute in the background, 
    - so we can have a module stored at "./utils/module.worker.js" that makes a fetch request to an API that takes some amount of time, and we can offload that to a web worker, and we would make a new instance with `const worker = new Worker(new URL('./utils/whisper.worker.js', import.meta.url), {type: 'module'})
    - here our URL is constructed with a URL object constructor, this just references the relative URL in our system and makes an absolute URL from it, the `import.meta.url` part is grabbing the absolute url from the given modules metadata
- so later in the useEffect, we define and added a event listener for the web worker, as mentioned above:
```
useEffect(() => {
    // if there is no web worker instance working, make a new one
    if (!worker.current) {
        worker.current = new Worker(new URL('./utils/whisper.worker.js', import.meta.url), {
            type: 'module'
        })
    };

    const onMessageReceived = async (e) => {
        switch (e.target.type) {
            case 'DOWNLOADING':
                setIsDownloading(true)
                console.log('DOWNLOADING');          
                break;
            case 'LOADING':
                setIsLoading(true)
                console.log('LOADING');          
                break;
            case 'RESULT':
                setOutput(e.data.results)
                console.log('RESULT RECEIVED');          
                break;
            case 'INFERENCE_DONE':
                setIsFinished(true)
                console.log('DONE');          
                break;
            default:
                console.log('INVALID EVENT FROM WORKER');
        }
    }

    worker.current.addEventListener('message', onMessageReceived)

    return () => worker.current.removeEventListener('message', onMessageReceived)
}, [])
```
- so in the useEffect, we create a worker instance, and this will get run on the first component mount, so we will have a webworker immediately
- then we define the event handler for it, and in the event handler we make a switch based on the `e.target.type` property of the event the handler recieves from the worker
- the switch is basically a nicer looking else if statement set, where we execute whatever block matches the type of event the worker sends
    - the code is self explanatory for the most part, we just trigger different flags depending on what the worker spits out
- lastly we set the event listener for that web worker, so now our handler is listening for the worker
- we also define a clean up function, so the event listener will be removed when one of the dependencies changes, which we have defined an empty array, so it should only be removed when App unmounts, which is basically when we reload the page to choose a new audio file

### Audio Context

- we also define a new function for processing our audio files:
```
async function readAudioFrom(audioFile) {
    const samplingRate = 16000
    const audioContext = new audioContext({sampleRate: samplingRate})
    const response = await audioFile.arrayBuffer()
    const decodedAudio = await audioContext.decodeAudioData(response)
    const audio = decodedAudio.getChannelData(0)
    return audio
}
```
- here we create a new audioContext object, which is a collection of audio processing modules built into a graph
- so basically it is a single object that is made of a bunch of connect tools, and the methods can use them all for our convenience
- here we make an audioContext with our chosen sampling rate, which for me is arbitrary
- then we call the `arrayBuffer()` method on our audioFile, which is a an uploaded audio file, and the arraybuffer is used to read a given file, and return a corresponding arrayBuffer object
    - an array buffer represents a raw data buffer, which is temporary data storage
- so we are storing our audioFile into a array buffer, then manipulating the data, like decoding the audio, which we do by calling the decodeAudioData method of the newly made audioContext, with the newly created array buffer as the argument
- in this case, decoding means to take the audio from the compressed format it would have been uploaded in, and decode it to the orginal data, and we do this at the sampling rate we specified, which again is the number of datapoints per second of audio we are going to use to represent the signal
- this gives us an audio buffer, basically an audio specific data buffer, we then store the newly decoded audio data in audio with the last line, which allows us to pass on the newly decoded audio for use
- so basically this whole function was used to take the uploaded, compressed, audio file and decode it so we can use the ML program to transcribe it 

### Web Worker PostMessage()

- the `postMessage()` method is used by web workers to send data between the worker and the program, both will use `postMessage()` to send data to the other 
```
async function handleFormSubmission() {
    if (!audioFile && audioStream) {return}

    let audio = await readAudioFrom((audioFile) ? (audioFile) : (audioStream))
    const model_name = 'openai/whisper-tiny.en'

    worker.current.postMessage({
        type: MessageTypes.INFERENCE_REQUEST,
        audio,
        model_name
    })

}
```
- here we define a piece of audio, and a model_name we want openai to use, and send a request to our web worker to presumably work on transcribing that audio, although we need to build the worker and see how it works to better understand first

### Building Web Worker with Huggingface

- hugging face docs can be found: https://huggingface.co/docs/transformers.js/installation
- we first have to install the "transformers" module of huggingface with `npm install @xenova/transformers`, transformers are a type of neural network

#### Pipeline Class

- we will interact with the ML model using a `pipeline`, a pipeline is an object that abstracts the complexity of the ML model, giving us input/output functions to work with it in
- in our `whisper.worker.js` file, we will construct a pipeline class using the singleton style:
```
class MyTranscriptionPipeline {
    static task = 'automatic-speech-recognition';
    static model = 'Xenova/whisper-tiny.en';

    // here we define an instance "flag", which hold our actual pipeline
    static instance = null;
    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            this.instance = await pipeline(this.task, this.model, { progress_callback })
        }
        return this.instance
    }   
}
```
- we see above that we have a flag for the instance of our pipeline, so if the pipeline already exists, we simply return the existing object, this ensures there is ever only a single pipeline for this worker
- for the pipeline itself, we define a task type we want to work on, and a model we are going to use, these models can be found on the huggingface model repo: https://huggingface.co/models?sort=trending
- we then generate the pipeline, and specify a callback function that will get called whenever there is progress on the audio analysis

#### Pipeline Creation and Use

```
self.addEventListener('message', async (e) => {
    const {type, audio} = e.data;
    if (type === MessageTypes.INFERENCE_REQUEST) {
        await transcribe(audio)
    }
})
```
- so this is the actual trigger for our web worker. When we receive a message from the app with the correct type, we call the transcribe function, which will make our actual pipeline and try to analyse data:
```
async function transcribe(audio) {
    sendLoadingMessage('LOADING')

    let pipeline
    try {
        pipeline = await MyTranscriptionPipeline.getInstance(loading_callback);

    } catch (err) {
        console.log(`error in transcribe try/catch: ${err.message}`);
    }
    sendLoadingMessage('LOADED')

    const stride_length_s = 0;
    const generationTracker = new GenerationTracker(pipeline, stride_length_s)

    let test = await pipeline(audio, {
        top_k: 0,
        do_sample: false,
        chunk_length_s: 30,
        stride_length_s,
        return_timestamps: true,
        callback_function: generationTracker.callbackFunction.bind(generationTracker),
        chunk_callback: generationTracker.chunkCallback.bind(generationTracker),
    });
    generationTracker.sendFinalResult()
}
async function loading_callback(data) {
    self.postMessage(data)
}
```
- so here we actually call upon the construction of the pipeline instance, we have to supply our class with a callback function, `loading_callback`, which simply delivers the model's messages to the App as it loads
- the callback is abstracted away from the pipeline call since we may want to add more functionality in the future for dealing with the types of files it returns as the model loads
- we also create an instance of a `generationTracker` class, this class is going to be used by us to track the partial progress of our model's transcribing as it goes, this way we are able to give the user updates on the progress of the model so they are not waiting around without any visual feedback on if the process is working
- I will describe the generation tracker momentarily
- We call the model to analyse our audio data with the `pipeline(audio, {...})` call, and we have to specify a number of options for the ML model
    - `top_k` and `do_sample` are methods of sampling for the model's choice of output. The ML model returns a distribution of possible "answers" with weighted confidence levels for the likelihood of each answer. If `do_sample` is false, we perform a "greedy search", which means the model just chooses the highest likelihood answer everytime. If `do_sample` is true we can sample the word space, meaning we pick a random word from the entire word space with weighted probabilities. If we define a `top_k` to some integer, then we will perform a sampled search while only choosing from the answers with the `top_k` probabilities. So if `top_k: 10`, we sample from the top 10 highest options
    - the `chunk_length_s` is the length of each divided audio segment, the model can only examine audio in 30s intervals, so we must divide the audio up. From testing, the model slows down significantly between audio "chunks", so we would prefer to have as large chunks as possible here
    - the `stride_length_s` is amount of overlap between audio chunks when divided up, the ML program needs context to decide the word, so general we get better results at the edges if there is overlap between chunks (https://huggingface.co/blog/asr-chunking)
        - however, due to the way the pipeline returns partial chunk data, there is no clean way to return partial inferences to the user without having the text repeating itself when the audio jumps from one chunk to another, so I set the stride length to 0, it seems to be working well anyway though
    - the specified `callback_function` is called when progress on an inference of a chunk is made, this is what allows us to give partial results to the users
    - the specified `chunk_callback` is called when a full audio chunk is finished being processed, after an audio chunk is finished, the regular `callback_function` resets and begins to return outputs from the new chunk, do we need to hold data from the `chunk_callback` and combine it with additional incoming data from the `callback_function` in order to build a proper partial output for the user
 

#### Generation Tracker Class

- you will notice the callback function are all methods from the constructed `GenerationTracker` object, the class is defined below:
```
class GenerationTracker {
    constructor(pipeline, stride_length_s) {
        this.pipeline = pipeline;
        this.stride_length_s = stride_length_s;
        this.chunks = [];
        this.time_precision = pipeline?.processor.feature_extractor.config.chunk_length / pipeline.model.config.max_source_positions;
    }

    sendFinalResult() {
        self.postMessage({
            status: 'FINISHED',
            type: MessageTypes.INFERENCE_DONE
        });
    }
    
    callbackFunction(beams) {
        const bestBeam = beams[0]
        let text = this.pipeline.tokenizer.decode(bestBeam.output_token_ids, {
            skip_special_tokens: true
        })

        const result = {
            text
        }

        createPartialResultMessage(result)
    }

    chunkCallback(data) {
        this.chunks.push(data)
        try {
            const decoded_chunk = this.pipeline.tokenizer._decode_asr(
                this.chunks, {
                    time_precision: this.time_precision,
                }
            )
            const text = decoded_chunk[0].trim()
            const result = {
                text
            }
            createResultMessage(
                result, false
            )

        } catch (error) {
            console.warn(`Error in ChunkCallback: \n${error.message}`);
        }
    }
};
```
- we define a generation tracker with out pipeline, and stride_length
- we calculate a time precision that is needed to give to our `chunkCallback` method
- as mentioned above, the `callbackFunction` is called to by the model whenever it has a new inference to give us. We call the data in the callback "beams" since the callback returns an array of possible options, however in our case it is always a single option since we are doing a greedy search, but the model can also use a beam search, where it returns a number of high probability beams (multi-node branches) sorted by probability
    - again we are not using this so its not terribly relevant, but in a beam search the model chooses the 'n' highest probability nodes from the current, and keeps them in memory, then goes down a level and finds the continuations of those branches that result in the highest probabiltiy for total branch. This allows us to find word strings that we may have missed if we chose only based on the probability of single words
- anyway it can return high probability beams and then we can choose the one we want in our manner, but we are doing a greedy search so we get a single string each time, but it is still in an array 
- we then call the decoder of the tokenizer to decode the returned token in words
    - tokenizing is the process of taking text strings and turning them into a usable data format for the model to work with, so we have to do the reverse process to the returned tokens at the end
- the `chunkCallback` is very similar, we hold all our chunks as one and decode them all each time, since there can be overlap between chunks, this is the only way to get a coherent string without overlap if using a non-zero stride_length
    - the decoder for chunks is different for regular partial data, this is because of the possible overlapping of chunks, and the decoder combines multiple chunks into a single string which is convenient for us
- the chunk often comes back with white space so we trim it and then send it to App in the same manner as the partial data!