import React from 'react';
import TextOutput from './TextOutput';
import AudioPlayer from './AudioPlayer';

export default function Transcription(props) {
    const { finalText, isTranscribing, isScribeLoading, scribeDownloadProgress, userAudio } = props
    
    return (
        <>
            {isScribeLoading ? (
                <div className='flex justify-center items-center gap-2'>
                    <p className='font-medium text-lg text-center text-blue-400 font-ai'>Training robot overlords...</p>
                    <div className='text-xl text-blue-400 font-ai'>{scribeDownloadProgress} %</div>
                </div>
            ) : (
                isTranscribing ? (
                    <div className='flex justify-center items-stretch gap-2'>
                        <div className='flex items-center specialBtnTrans rounded-lg px-3 py-2 text-blue-400 font-medium gap-3 font-ai'><p className='font-ai'>Deciphering Audio</p><i className="fa-solid fa-spinner animate-spin"></i></div>
                    </div>
                ) : (
                    <div className='flex justify-center items-stretch gap-2'>
                        <div className='flex items-center specialBtnTrans rounded-lg px-3 py-2 text-blue-400 font-medium gap-3 font-ai'><p className='font-ai'>Transcription Finished</p></div>
                    </div>
                )
            )}
            <TextOutput key='ScribeText' isLoading={isScribeLoading} displayText={finalText} />
            <p className="rounded p-4 text-transparent bg-transparent">Warning: The translation model is included to display in-browser Machine Learning capabilities, but is very large (&gt; 400 Mb) and may require minutes to download upon first translation request of session.</p>
        </>
    )
}
