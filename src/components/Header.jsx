import React from 'react'

export default function Header() {
  return (
    <header className='flex items-center justify-between p-4'>
        <a href='/'>
          <h1 className='text-2xl'>Scribe<span className='text-blue-400'>AI</span></h1>
        </a>
        <a href='/' className='flex items-center gap-2 specialBtn px-4 py-2 rounded-lg text-blue-400 hover:text-blue-700 duration-200'><p>New</p><i className="fa-solid fa-plus"></i></a>
    </header>
  )
}
