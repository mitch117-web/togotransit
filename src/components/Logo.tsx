import React from 'react'

type LogoMarkProps = {
  size?: number
  variant?: 'circle' | 'glyph'
  glyphColor?: string
  className?: string
}

/**
 * Marque TogoTransit « Soleil » : un T sous un soleil levant (même géométrie que l'icône de l'application mobile).
 * - circle : pastille indigo, pour les fonds clairs
 * - glyph  : T blanc + soleil sans pastille, pour les fonds sombres
 */
export function LogoMark({ size = 40, variant = 'circle', glyphColor = '#ffffff', className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={variant === 'glyph' ? '8 8 48 48' : '0 0 64 64'}
      className={className}
      aria-hidden="true"
    >
      {variant === 'circle' && <circle cx="32" cy="32" r="32" fill="#1C2A5E" />}
      <path d="M22.5 20 A9.5 9.5 0 0 1 41.5 20 Z" fill="#FFB020" />
      <rect x="12" y="20" width="40" height="9" rx="3" fill={glyphColor} />
      <rect x="26.5" y="24" width="11" height="30" rx="3" fill={glyphColor} />
    </svg>
  )
}

type LogoProps = {
  size?: number
  tone?: 'onLight' | 'onDark'
  className?: string
}

/** Logo complet : marque + nom. Sur fond sombre, « Togo » est blanc et « Transit » prend la couleur du soleil. */
export function Logo({ size = 40, tone = 'onLight', className = '' }: LogoProps) {
  const dark = tone === 'onDark'
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} variant={dark ? 'glyph' : 'circle'} />
      <span className="tracking-tight leading-none" style={{ fontSize: Math.round(size * 0.5) }}>
        <span className={dark ? 'font-black text-white' : 'font-black text-primary'}>Togo</span>
        <span className={dark ? 'font-black text-tertiary' : 'font-medium text-primary'}>Transit</span>
      </span>
    </span>
  )
}

export default Logo
