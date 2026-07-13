interface IconProps {
  className?: string
}

const base = {
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function IconClose({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </svg>
  )
}

export function IconChevronLeft({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

export function IconChevronRight({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

export function IconInbox({ className = 'w-10 h-10' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
    </svg>
  )
}

export function IconCheckCircle({ className = 'w-12 h-12' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="M22 4 12 14.01l-3-3" />
    </svg>
  )
}

export function IconDocument({ className = 'w-10 h-10' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </svg>
  )
}

export function IconFileWord({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <path d="M14 2v6h6" />
      <path d="M8 13l1.4 5L11 14l1.6 4L14 13" />
    </svg>
  )
}

export function IconFileExcel({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <path d="M14 2v6h6" />
      <path d="M8 12h8" />
      <path d="M8 16h8" />
      <path d="M12 12v6" />
    </svg>
  )
}

export function IconChevronDown({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function IconUpload({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  )
}

export function IconHome({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
  )
}

export function IconShieldCheck({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3 4 6v6c0 4.5 3.2 7.7 8 9 4.8-1.3 8-4.5 8-9V6l-8-3z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

export function IconArrowUpRight({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M7 17 17 7" />
      <path d="M9 7h8v8" />
    </svg>
  )
}

export function IconBarChart({ className = 'w-8 h-8' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 20V10" />
      <path d="M12 20V4" />
      <path d="M20 20v-7" />
    </svg>
  )
}

export function IconMail({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m3.5 6 8.5 7 8.5-7" />
    </svg>
  )
}

export function IconWallet({ className = 'w-8 h-8' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
      <path d="M17 12h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a2 2 0 0 1 0-4z" />
      <path d="M3 8h13" />
    </svg>
  )
}
