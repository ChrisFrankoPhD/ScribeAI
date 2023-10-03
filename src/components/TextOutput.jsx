import React from 'react'

export default function TextOutput(props) {
    const { displayText, isLoading } = props

    function handleCopy() {
        navigator.clipboard.writeText(displayText)
    }

    function handleDownload() {
        const element = document.createElement('a')
        const file = new Blob([displayText], {type: "text/plain"})
        element.href = URL.createObjectURL(file)
        element.download = `ScribeAI_${(new Date()).toString()}.txt`
        document.body.appendChild(element)
        element.click()
    }

    return (
        <>
            {isLoading ? (
                <div className='flex flex-col gap-2 sm:gap-4 mx-auto w-full py-3'>
                    {
                        [0,1,2].map(val => {
                            return(
                                <div key={val} className={'rounded-full h-2 sm:h-3 bg-slate-400 loading ' + `loading${val}`}></div>
                            )
                        })
                    }
                </div>
            ) : (
                <>
                    <div className='flex bg-white rounded-lg max-h-52 overflow-scroll p-4'>
                        {displayText}
                    </div>
                    <div className='flex items-center gap-4 mx-auto'> 
                        <button className='specialBtn text-blue-300 hover:text-blue-600 duration-200 px-3 aspect-square place-items-center rounded' title="copy to clipboard" onClick={handleCopy}>
                            <i className="fa-solid fa-copy"></i>
                        </button>
                        <button className='specialBtn text-blue-300 hover:text-blue-600 duration-200 px-3 aspect-square place-items-center rounded' title="download" onClick={handleDownload}>
                            <i className="fa-solid fa-download"></i>
                            </button>
                        {/* <button className='specialBtn text-blue-300 hover:text-blue-600 duration-200 px-3 aspect-square place-items-center rounded' title="share">
                            <i className="fa-solid fa-arrow-up-from-bracket"></i>
                        </button> */}
                    </div>
                </>
            )}
        </>
    )
}
