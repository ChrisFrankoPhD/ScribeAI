import { useEffect, useState, useRef } from 'react';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import FileDisplay from './components/FileDisplay';
import Information from './components/Information';
import { MessageTypes } from './utils/presets';

export default function App() {
  // states to store uploaded audio files or recorded audio files
  const [audioFile, setAudioFile] = useState(null);
  const [audioStream, setAudioStream] = useState(null);
  // const [audioPlay, setAudioPlay] = useState(null);
  
  // flag to tell us when there is a transcribed output ready to load information page
  const [output, setOutput] = useState([])
  const [partial, setPartial] = useState("")
  const [finalText, setFinalText] = useState("")
  // state for flagging when ML models are still working, for loading page
  const [isAiActive, setIsAiActive] = useState(false)
  const [isScribeLoading, setIsScribeLoading] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [scribeDownloadItems, setScribeDownloadItems] = useState({})
  const [scribeDownloadProgress, setScribeDownloadProgress] = useState(0)

  // flag for is there is a any usable audiofile for deciding when to load the file display page
  const isAudio = audioFile || audioStream;

  // create a reference state for a web worker instance
  const worker = useRef(null)

  useEffect(() => {
    // if there is no web worker instance working, make a new one
    if (!worker.current) {
      worker.current = new Worker(new URL('./utils/whisper.worker.js', import.meta.url), {
        type: 'module'
      })
    };

    setScribeDownloadProgress(() => {
      const total = Object.keys(scribeDownloadItems).length * 100
      let sumProgress = 0
      Object.values(scribeDownloadItems).forEach(progress => sumProgress += progress)
      return (Math.round(sumProgress / total * 100))
    })

    setFinalText(output + partial)
    // console.log(output);
    // console.log(partial);
    // console.log(finalText);

    const onMessageReceived = async (e) => {
      // console.log('messaged received from worker');
      switch (e.data.status) {
        case 'LOADING':
          setIsScribeLoading(true)
          setIsAiActive(true)
          console.log('Model Loading');          
          break;
        case 'initiate':
          setIsScribeLoading(true)
          setScribeDownloadItems(prev => {
            return {...prev, [e.data.file]: 0}
          });
          break;
        case 'progress':
          setScribeDownloadItems(prev => {
            return {...prev, [e.data.file]: e.data.progress}
          })
          break;
        case 'LOADED':
          console.log('Model Loaded');          
          break;
        case 'ready':
          setIsTranscribing(true)
          setIsScribeLoading(false)
          break;
        case 'PARTIAL':
          setPartial(e.data.result.text)
          break;
        case 'CHUNK':
          setOutput(e.data.result.text)
          setPartial("")
          break;
        case 'FINISHED':
          setIsTranscribing(false)
          console.log('INFERENCE FINISHED SUCCESSFULLY');          
          break;
        default:
          break;
      }
    }

    worker.current.addEventListener('message', onMessageReceived)

    return () => worker.current.removeEventListener('message', onMessageReceived)
  })

  // reset the audio file states when returning to the homepage
  function handleAudioReset(){
    setAudioFile(null)
    setAudioStream(null)
  }
  // function that takes the uploaded or streamed audio file, and uses the AudioContext module to uncompress/decode it into analisable data
  async function readAudioFrom(audioFile) {
    const samplingRate = 16000
    const audioCxt = new AudioContext({sampleRate: samplingRate})
    const response = await audioFile.arrayBuffer()
    const decodedAudio = await audioCxt.decodeAudioData(response)
    const audio = decodedAudio.getChannelData(0)
    return audio
  }
  // function that calls the transcribe web worker, it first decodes audio file with the readAudioFile function, then sends that file to the worker with an inference request
  async function handleFormSubmission() {
    if (!audioFile && !audioStream) {return}

    let audio = await readAudioFrom((audioFile) ? (audioFile) : (audioStream))
    // setAudioPlay(audio)
    // const model_name = 'Xenova/whisper-tiny.en'

    worker.current.postMessage({
      type: MessageTypes.INFERENCE_REQUEST,
      audio,
      // model_name
    })

  }


  return (
    <>
      <div className='flex flex-col max-w-5xl mx-auto w-full text-slate-700 text-sm sm:text-base'>
        <section className='flex flex-col min-h-screen'>
          <Header />
          {isAiActive ? (
            <Information output={output} finalText={finalText} isScribeLoading={isScribeLoading} scribeDownloadProgress={scribeDownloadProgress} isTranscribing={isTranscribing} />
          ) : (
            isAudio ? (
              <FileDisplay audioFile={audioFile} audioStream={audioStream} handleAudioReset={handleAudioReset} handleFormSubmission={handleFormSubmission}/>
            ) : (
              <Dashboard setAudioFile={setAudioFile} setAudioStream={setAudioStream} />
            )
          )}
        </section>
        <footer>

        </footer>
      </div> 
    </>
  )
};
