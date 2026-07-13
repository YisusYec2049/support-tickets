import { useEffect, useRef, useState } from 'react'
import { IconChevronDown } from './icons'

interface Option {
  value: string
  label: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  invalid?: boolean
}

export default function Select({ value, onChange, options, placeholder = 'Seleccionar...', invalid }: Props) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  function openMenu() {
    setMounted(true)
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
  }

  function closeMenu() {
    setVisible(false)
    setTimeout(() => setMounted(false), 150)
  }

  useEffect(() => {
    if (!mounted) return
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) closeMenu()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeMenu()
    }
    document.addEventListener('mousedown', handleClick)
    window.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      window.removeEventListener('keydown', handleKey)
    }
  }, [mounted])

  const selected = options.find((o) => o.value === value)

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => (mounted ? closeMenu() : openMenu())}
        className={`w-full flex items-center justify-between gap-2 border rounded-xl pl-3.5 pr-3 py-2.5 text-sm bg-slate-50/60 transition-all duration-150 ease-spring focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500/50 ${
          invalid ? 'border-red-400' : 'border-black/10 hover:border-brand-400'
        } ${mounted ? 'bg-white ring-2 ring-brand-500/50 border-brand-400' : ''}`}
      >
        <span className={selected ? 'text-slate-800' : 'text-slate-400'}>
          {selected ? selected.label : placeholder}
        </span>
        <IconChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ease-spring ${mounted ? 'rotate-180' : ''}`}
        />
      </button>

      {mounted && (
        <div
          className={`absolute z-20 mt-1.5 w-full origin-top bg-white border border-black/[0.06] rounded-xl shadow-[0_1px_1px_rgba(0,0,0,0.03),0_16px_40px_-16px_rgba(0,0,0,0.25)] p-1 max-h-60 overflow-auto transition-all duration-150 ease-spring ${
            visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value)
                closeMenu()
              }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors rounded-lg ${
                o.value === value ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
