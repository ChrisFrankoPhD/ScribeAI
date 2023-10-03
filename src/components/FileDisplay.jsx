import React, { useEffect } from 'react'

export default function FileDisplay(props) {
    const { audioFile, audioStream, handleAudioReset, handleFormSubmission } = props
    
    return (
        <main className='flex flex-col flex-1 justify-center text-center p-4 pb-20 gap-4 md:gap-5 w-72 md:w-96 max-w-full mx-auto'>
            <h1 className='text-4xl my-3 sm:text-5xl md:text-6xl'>Your<span className='text-blue-400'>File</span></h1>
            <div className='flex flex-col text-center md:text-left'>
                <h3 className='font-medium'>Name</h3>
                <p className='italic'>{(audioFile) ? (audioFile.name) : ("Custom audio")}</p>
            </div>
            <div className='flex flex-col md:flex-row items-center justify-between gap-4'>
                <button className='hidden md:inline-block text-slate-500 cursor-pointer hover:text-red-600 duration-200' onClick={handleAudioReset} >Reset</button>
                <button className='flex items-center gap-2 specialBtn px-4 py-2 rounded-lg text-blue-400 hover:text-blue-700' onClick={handleFormSubmission}><p>Transcribe</p><i className="fa-solid fa-feather"></i></button>
                <button className='inline-block md:hidden text-slate-500 cursor-pointer hover:text-red-600  duration-200' onClick={handleAudioReset}>Reset</button>
            </div>
        </main>
    )
    }
