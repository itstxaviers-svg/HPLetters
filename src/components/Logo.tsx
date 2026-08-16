import logo from '../assets/brand/logo-learn-letters.webp'

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'brand--compact' : ''}`}>
      <img src={logo} alt="Learn Letters" />
      <div>
        <span className="brand__eyebrow">Magical handwriting academy (Волшебная академия письма)</span>
        <strong>Learn Letters</strong>
      </div>
    </div>
  )
}
