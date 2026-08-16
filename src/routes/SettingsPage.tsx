import { Navigate } from 'react-router-dom'
import { Eye, Music, RotateCcw } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { PageShell } from '../components/PageShell'
import { TopBar } from '../components/TopBar'

export function SettingsPage() {
  const { currentStudent, data, updateSettings, resetCurrentProgress } = useApp()
  if (!currentStudent) return <Navigate to="/" replace />

  return (
    <PageShell>
      <TopBar backTo="/menu" backLabel="Letter menu (Меню букв)" minimal />
      <section className="settings-card parchment-card">
        <span className="card-kicker">Preferences (Параметры)</span><h1><span className="title-en">Settings</span><small className="title-ru">(Настройки)</small></h1><p>Choose a calm, comfortable experience for this device. (Настройте удобный режим для этого устройства.)</p>
        <div className="setting-row"><span><Music /><span><strong>Tracing sounds (Звуки при письме)</strong><small>Play the phonics sound while drawing. (Проигрывать звук во время обведения.)</small></span></span><button role="switch" aria-checked={data.settings.sound} className={`toggle ${data.settings.sound ? 'is-on' : ''}`} onClick={() => updateSettings({ sound: !data.settings.sound })}><i /></button></div>
        <div className="setting-row"><span><Eye /><span><strong>Reduce visual effects (Уменьшить эффекты)</strong><small>Keep celebrations and backgrounds extra gentle. (Сделать анимации и фон спокойнее.)</small></span></span><button role="switch" aria-checked={data.settings.reducedEffects} className={`toggle ${data.settings.reducedEffects ? 'is-on' : ''}`} onClick={() => updateSettings({ reducedEffects: !data.settings.reducedEffects })}><i /></button></div>
        <div className="danger-zone"><div><RotateCcw /><span><strong>Reset progress (Сбросить прогресс)</strong><small>Clears letters, attempts and rewards for {currentStudent.name}. (Удалит буквы, попытки и награды ученика.)</small></span></div><button className="danger-button" onClick={() => { if (window.confirm(`Reset all progress for ${currentStudent.name}? (Сбросить весь прогресс ученика ${currentStudent.name}?)`)) resetCurrentProgress() }}>Reset (Сбросить)</button></div>
      </section>
    </PageShell>
  )
}
