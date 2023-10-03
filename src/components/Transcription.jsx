import React from 'react';
import TextOutput from './TextOutput';

export default function Transcription(props) {
    const { finalText, isTranscribing, isScribeLoading, scribeDownloadProgress } = props
    
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
                        <button className='flex items-center specialBtn rounded-lg px-3 py-2 text-blue-400 hover:text-blue-700 duration-200 font-medium gap-3'><p>Play Original Audio</p><i className="fa-solid fa-play"></i></button>
                    </div>
                )
            )}
            <TextOutput key='ScribeText' isLoading={isScribeLoading} displayText={finalText} />
        </>
    )
}
