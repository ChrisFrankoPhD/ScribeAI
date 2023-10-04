import React, { useState, useEffect, useRef } from "react";

export default function Dashboard(props) {
    const { setAudioFile, setAudioStream } = props

    const [recordingStatus, setRecordingStatus] = useState('inactive')
    const [audioChunks, setAudioChunks] = useState([])
    const [duration, setDuration] = useState(0)

    const mediaRecorder = useRef(null)

    // specify the media type to be recorded by the MediaRecorder object later
    const mimeType = 'audio/wedm'

    // function to be called when recording is started
    async function startRecording() {
        let tempStream
        console.log('Start Recording');
        try {
            // access the users media recording devices through the navigator, only request access to audio
            const streamData = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
            })
            tempStream = streamData
        } catch (err) {
            console.log(err.message);
            return
        }
        setRecordingStatus('recording')
        // creating new MediaRecorder instance using the tempStream we just defined above with the users media devices, and specify the media type (mimeType)
        const media = new MediaRecorder(tempStream, { type: mimeType })
        // set the mediaRecorder refState to the new MediaRecorder object
        mediaRecorder.current = media
        // start recording media
        mediaRecorder.current.start()

        // specify an array for storing chunks of audio data, then specify an event listener for when audio chunks are available
        let tempAudioChunks = []
        mediaRecorder.current.ondataavailable = (e) => {
            // audio chunks are passed in the event, if the chunk has no data then do nothing, otherwise add the audio data to the tempAudioChunks array
            if (typeof e.data === 'undefined') {return}
            if (typeof e.data.size === '0') {return}
            tempAudioChunks.push(e.data)
        }
        // set the audioChunks state to the newly made tempAudioChunks array 
        setAudioChunks(tempAudioChunks)
    }

    // function to be called when recording is stoped
    async function stopRecording() {
        // set recording status to inactive
        setRecordingStatus('inactive')
        console.log('stop recording');

        // stop the MediaRecorder object we created, and define the event handler that is called when that recorder is stopped
        mediaRecorder.current.stop()
        mediaRecorder.current.onstop = () => {
            // call the Blob constructor, which creates a data blob from an array with data chunks
            const audioBlob = new Blob(audioChunks, {type: mimeType})
            // set the audioStream state that was passed from App to the newly formed audio Data blob object, and reset our audio chunks object so it is ready for a new recording
            setAudioStream(audioBlob)
            setAudioChunks([])
            setDuration(0)
        }
    }

    useEffect(() => {
        if (recordingStatus === 'inactive') {return}
        const interval = setInterval(() => {
            setDuration(current => current + 1)
        }, 1000)

        return () => {
            clearInterval(interval)
            // setDuration(0)
        }
    })

    return (
        <main className='flex flex-col flex-1 justify-center items-center p-4 pb-20 gap-3 sm:gap-4 md:gap-5'>
            <h1 className='text-5xl sm:text-6xl md:text-7xl'>Scribe<span className='text-blue-400'>AI</span></h1>
            <h3 className='font-semibold md:text-md'>
                Record 
                <i className="text-blue-400 fa-solid fa-arrow-right px-2"></i> 
                Transcribe 
                <i className="text-blue-400 fa-solid fa-arrow-right px-2"></i> 
                Translate
            </h3>
            <button className="flex items-center justify-between gap-4 mx-auto w-72 max-w-full my-4 text-lg font-medium specialBtn px-4 py-2 rounded-xl text-blue-400 hover:text-blue-600" onClick={(recordingStatus === 'inactive') ? (
                    startRecording
                    ) : (
                        stopRecording
                        )}>
                <p className="">{
                    (recordingStatus === 'inactive') ? (
                        'Record'
                        ) : (
                            'Stop'
                            )}
                </p>
                <div className="flex items-center gap-2 text-slate-700">
                    {duration != 0 && (
                        <p className="">{duration} s</p>
                    )}
                    <i className={"fa-solid fa-microphone " + ((recordingStatus === "inactive") ? ("") : ("text-red-600"))}></i>
                </div>
                
            </button>
            <p className="text-base font-medium">
                Or <label className="text-blue-400 cursor-pointer hover:text-blue-600 duration-200"> upload <input className="hidden" type="file" accept=".mp3,.wave" onChange={(e) => {
                    const tempFile = e.target.files[0]
                    setAudioFile(tempFile)
                }}/>
                </label> an mp3 from your computer
            </p>
        </main>
    )
}