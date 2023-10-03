import React, { useState, useEffect, useRef } from 'react';
import Transcription from './Transcription';
import Translation from './Translation';
import { MessageTypes } from './../utils/presets';

export default function Information(props) {
    const { finalText, isScribeLoading, scribeDownloadProgress, isTranscribing } = props;
    const [isTransLoading, setIsTransLoading] = useState(false)
    const [transDownloadItems, setTransDownloadItems] = useState({})
    const [transDownloadProgress, setTransDownloadProgress] = useState(0)
    const [tab, setTab] = useState('transcription')
    const [translation, setTranslation] = useState(null)
    const [toLanguage, setToLanguage] = useState("Select Language")
    const [isTranslating, setIsTranslating] = useState(false)
    

    // create a reference state for a web worker instance
    const worker = useRef(null)

    useEffect(() => {
        // if there is no web worker instance working, make a new one
        if (!worker.current) {
            worker.current = new Worker(new URL('./../utils/translate.worker.js', import.meta.url), {
                type: 'module'
            })
        };

        setTransDownloadProgress(() => {
            const total = Object.keys(transDownloadItems).length * 100
            let sumProgress = 0
            Object.values(transDownloadItems).forEach(progress => sumProgress += progress)
            return (Math.round(sumProgress / total * 100))
        })  

        const onMessageReceived = async (e) => {
            // console.log('messaged received from worker');
            switch (e.data.status) {
                case 'initiate':
                    console.log('INITIATE');
                    setIsTransLoading(true)
                    setTransDownloadItems(prev => {
                        return {...prev, [e.data.file]: 0}
                    });
                    break;
                case 'progress':
                    // console.log('PROGRESS');  
                    // console.log(e.data);
                    setTransDownloadItems(prev => {
                        return {...prev, [e.data.file]: e.data.progress}
                    })    
                    break;
                case 'done':
                    setTransDownloadItems(prev => {
                        return {...prev, [e.data.file]: 100}
                    })
                    // console.log(e.data.output)
                    // console.log('RESULT RECEIVED');          
                    break;
                case 'LOADED':
                    setIsTransLoading(false)
                    setIsTranslating(true)
                    console.log('MODEL LOADED SUCCESSFULLY');
                case 'update':
                    setTranslation(e.data.output)
                    // console.log(e.data.output)
                    // console.log('RESULT RECEIVED');          
                    break;
                case 'complete':
                    setIsTranslating(false)
                    console.log('DONE');          
                    break;
                default:
                    break;
            }
        }
      
        worker.current.addEventListener('message', onMessageReceived)
    
        return () => worker.current.removeEventListener('message', onMessageReceived)
    })

    const transText = (isTranslating || translation) ? (translation) : (finalText)

    function generateTranslation() {
        if (isTranslating || toLanguage === 'Select Language') {
            return
        }

        worker.current.postMessage({
            text: finalText,
            src_lang: "eng_Latn",
            tgt_lang: toLanguage,
            type: MessageTypes.INFERENCE_REQUEST
        })
    }
    

    return (
        <main className='flex flex-col flex-1 justify-center text-center p-4 pb-20 gap-2 md:gap-3 w-full max-w-prose mx-auto'>
            <h1 className='flex flex-col md:block text-4xl my-3 sm:text-5xl md:text-6xl'>
                Your
                <span className='text-blue-400'>
                    {tab === 'transcription' ? (
                        'Transcription'
                    ) : (
                        'Translation'
                    )}
                </span>
            </h1>
            <div className='grid grid-cols-2 items-center mx-auto bg-white border-2 shadow rounded-full overflow-hidden text-lg'>
                <button className={'px-4 py-1 duration-200 font-medium ' + (
                    tab ==='transcription' ? 'bg-blue-400 text-white' : 'text-blue-400 hover:text-blue-700 hover:bg-slate-100')} onClick={() => setTab('transcription')}>
                    Transcription
                </button>
                <button className={'px-4 py-1 duration-200 font-medium ' + (
                    tab ==='translation' ? 'bg-blue-400 text-white' : 'text-blue-400 hover:text-blue-700 hover:bg-slate-100')} onClick={() => setTab('translation')}>
                    Translation
                </button>
            </div>
            <>
                {tab === 'transcription' ? (
                    <Transcription finalText={finalText} isTranscribing={isTranscribing} isScribeLoading={isScribeLoading} scribeDownloadProgress={scribeDownloadProgress} />
                ) : (
                    <Translation transText={transText} isTransLoading={isTransLoading} isTranslating={isTranslating} toLanguage={toLanguage} generateTranslation={generateTranslation} setToLanguage={setToLanguage} transDownloadProgress={transDownloadProgress} />
                )}
            </>
        </main>
    )
}

