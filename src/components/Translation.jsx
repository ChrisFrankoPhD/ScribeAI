import React from 'react'
import { LANGUAGES } from '../utils/presets';
import TextOutput from './TextOutput';

export default function Translation(props) {
    const { transText, isTransLoading, isTranslating, toLanguage, setToLanguage, generateTranslation, transDownloadProgress } = props;

    return (
        <>
            {isTransLoading ? (
                <div className='flex justify-center items-stretch gap-2'>
                    <p className='font-medium text-lg text-center text-blue-400 font-ai'>Loading Translation Model...</p>
                    <div className='text-xl text-blue-400 font-ai'>{transDownloadProgress} %</div>
                </div>
            ) : (
                isTranslating ? (
                    <div className='flex justify-center items-stretch gap-2'>
                        <div className='flex items-center specialBtnTrans rounded-lg px-3 py-2 text-blue-400 font-medium gap-3 font-ai'><p className='font-ai'>Translating Text</p><i className="fa-solid fa-spinner animate-spin"></i></div>
                    </div>
                ) : (
                    <div className='flex justify-center items-stretch gap-2'>
                        <select className='outline-none p-1 flex-1 bg-white rounded border border-solid border-transparent hover:border-blue-300 duration-200' value={toLanguage} onChange={(e) => setToLanguage(e.target.value)} name="language selection">
                            <option value={'Select Language'}>Select Language</option>
                            {Object.entries(LANGUAGES).map(([key, value]) => {
                                return (
                                    <option key={key} value={value}>{key}</option>
                                )
                            })}
                        </select>
                        <button className='specialBtn px-3 py-2 text-blue-400 hover:text-blue-700 duration-200 font-medium' onClick={generateTranslation}>Translate</button>
                    </div>
                )
            )}
            <TextOutput key='TransText' isLoading={isTransLoading} displayText={transText} />
            <p className="bg-slate-400/30 rounded p-4 text-red-500">Warning: The translation model is included to display in-browser Machine Learning capabilities, but is very large (&gt; 400 Mb) and may require minutes to download upon first translation request of session.</p>
        </>
    )
}
