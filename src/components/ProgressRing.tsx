import type { CSSProperties } from 'react'

export function ProgressRing({ value, label }: { value: number; label: string }) {
  return (
    <div className="progress-ring" style={{ '--progress': `${Math.max(0, Math.min(100, value)) * 3.6}deg` } as CSSProperties}>
      <div><strong>{value}%</strong><span>{label}</span></div>
    </div>
  )
}
