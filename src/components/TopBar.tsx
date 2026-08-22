import { ArrowLeft, Settings, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Logo } from './Logo'
import { useApp } from '../context/AppContext'

interface TopBarProps {
  backTo?: string
  backLabel?: string
  minimal?: boolean
  hideBrand?: boolean
}

export function TopBar({ backTo, backLabel = 'Back (Назад)', minimal = false, hideBrand = false }: TopBarProps) {
  const navigate = useNavigate()
  const { syncStatus } = useApp()
  const syncLabel = syncStatus === 'synced' ? 'Cloud progress saved (Прогресс в облаке)'
    : syncStatus === 'syncing' ? 'Saving to cloud… (Сохраняем…)'
      : syncStatus === 'error' ? 'Saved locally • cloud offline (Локально сохранено)'
        : 'Local progress saved (Прогресс сохранён)'
  return (
    <header className="topbar">
      {backTo ? (
        <button className="icon-button icon-button--labeled" onClick={() => navigate(backTo)} aria-label={backLabel}>
          <ArrowLeft size={20} /><span>{backLabel}</span>
        </button>
      ) : hideBrand ? <span /> : <Logo compact />}
      {!minimal && (
        <div className="topbar__actions">
          <span className={`status-pill status-pill--${syncStatus}`}><Sparkles size={15} /> {syncLabel}</span>
          <button className="icon-button" onClick={() => navigate('/settings')} aria-label="Settings (Настройки)"><Settings size={20} /></button>
        </div>
      )}
    </header>
  )
}
