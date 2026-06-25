import { useState, useEffect } from 'react'

interface Props {
  url: string
  imageClassName?: string
}

export default function FileAttachment({ url, imageClassName }: Props) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const ext = url.split('.').pop()?.toLowerCase() ?? ''

  function openLightbox() {
    setMounted(true)
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
  }

  function closeLightbox() {
    setVisible(false)
    setTimeout(() => setMounted(false), 300)
  }

  useEffect(() => {
    if (!mounted) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeLightbox() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [mounted])

  if (['png', 'jpg', 'jpeg'].includes(ext)) {
    return (
      <>
        <img
          src={url}
          alt="Adjunto"
          onClick={openLightbox}
          className={`cursor-zoom-in ${imageClassName ?? 'max-h-48 rounded-lg border border-slate-200 object-contain hover:opacity-90 transition-opacity'}`}
        />
        {mounted && (
          <div
            className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${visible ? 'bg-black/80' : 'bg-black/0'}`}
            onClick={closeLightbox}
          >
            <img
              src={url}
              alt="Adjunto"
              className={`max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl transition-all duration-300 ${visible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={closeLightbox}
              className={`absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full w-9 h-9 flex items-center justify-center text-lg transition-all duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
            >
              ✕
            </button>
          </div>
        )}
      </>
    )
  }

  if (ext === 'pdf') {
    return <iframe src={url} className="w-full h-96 rounded-lg border border-slate-200" title="Adjunto PDF" />
  }

  const isWord = ['doc', 'docx'].includes(ext)
  const googleViewUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}`
  const label = isWord ? 'Documento Word' : 'Hoja de cálculo Excel'
  const iconBg = isWord ? 'bg-blue-600' : 'bg-green-600'
  const iconLabel = isWord ? 'W' : 'X'

  return (
    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${iconBg}`}>
        {iconLabel}
      </div>
      <span className="flex-1 text-sm text-slate-700 font-medium">{label}</span>
      <div className="flex items-center gap-1">
        <a
          href={googleViewUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Ver archivo"
          className="p-1.5 text-slate-500 hover:text-brand-700 hover:bg-brand-50 rounded-md transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </a>
        <a
          href={url}
          download
          title="Descargar archivo"
          className="p-1.5 text-slate-500 hover:text-brand-700 hover:bg-brand-50 rounded-md transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </a>
      </div>
    </div>
  )
}
