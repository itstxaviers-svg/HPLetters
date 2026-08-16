import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { RotateCcw, Volume2, VolumeX, WandSparkles } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { lessonByKey } from '../data/lessons'
import type { StageKind } from '../types'
import { PageShell } from '../components/PageShell'
import { TopBar } from '../components/TopBar'
import { TracingEngine } from '../components/TracingEngine'
import { Modal } from '../components/Modal'
import chestOpen from '../assets/rewards/reward-chest-open.png'

export function LessonPage() {
  const { letter } = useParams()
  const navigate = useNavigate()
  const { currentStudent, data, teacherMode, recordAttempt, resetStage } = useApp()
  const lesson = lessonByKey[letter ?? '']
  const [clearToken, setClearToken] = useState(0)
  const [feedback, setFeedback] = useState<{ accuracy: number; success: boolean } | null>(null)
  const [completed, setCompleted] = useState(false)
  const [soundOn, setSoundOn] = useState(data.settings.sound)
  const [teacherStage, setTeacherStage] = useState<StageKind>('uppercase')
  const [teacherAttempts, setTeacherAttempts] = useState<Record<StageKind, { accuracy: number; success: boolean }[]>>({ uppercase: [], lowercase: [] })

  const stored = currentStudent && lesson ? currentStudent.progress[lesson.key] : undefined
  const stage: StageKind = teacherMode ? teacherStage : (stored?.uppercase.completed ? 'lowercase' : 'uppercase')
  const stageProgress = stored?.[stage]
  const savedAttempts = useMemo(() => stageProgress?.attempts.slice(stageProgress.roundStartIndex ?? 0) ?? [], [stageProgress])
  const roundAttempts = teacherMode ? teacherAttempts[stage] : savedAttempts
  const successes = roundAttempts.filter((attempt) => attempt.success).length
  const attemptsUsed = roundAttempts.length
  const locked = attemptsUsed >= (lesson?.maxAttempts ?? 5) || (!teacherMode && Boolean(stageProgress?.completed))

  if (!currentStudent) return <Navigate to="/" replace />
  if (!lesson) return <Navigate to="/menu" replace />

  const handleResult = (accuracy: number, success: boolean) => {
    setFeedback({ accuracy, success })
    if (teacherMode) {
      setTeacherAttempts((previous) => ({ ...previous, [stage]: [...previous[stage], { accuracy, success }] }))
    } else {
      recordAttempt(lesson.key, stage, accuracy, success)
    }
    const nextSuccesses = successes + (success ? 1 : 0)
    if (nextSuccesses >= lesson.requiredSuccesses) {
      if (!teacherMode && stage === 'lowercase') setCompleted(true)
      window.setTimeout(() => setFeedback(null), 1700)
    } else {
      window.setTimeout(() => setFeedback(null), 1450)
    }
  }

  const replaySound = () => {
    if (!lesson.soundUrl) return
    const audio = new Audio(lesson.soundUrl)
    void audio.play().catch(() => undefined)
  }

  const outOfAttempts = attemptsUsed >= lesson.maxAttempts && successes < lesson.requiredSuccesses

  return (
    <PageShell variant="tracing" className="lesson-page">
      <TopBar backTo="/menu" backLabel="Letter menu (Меню букв)" minimal />
      <section className="lesson-layout">
        <aside className="lesson-sidebar">
          <span className="card-kicker">Letter {lesson.order + 1} (Буква {lesson.order + 1})</span>
          <h1><span className="title-en">Make the sound</span><small className="title-ru">(Произнеси звук)</small><em>/{lesson.key}/</em></h1>
          <button className="sound-orb" onClick={replaySound} disabled={!lesson.soundUrl} aria-label={`Play ${lesson.key} sound`}><Volume2 /><span>{lesson.soundUrl ? lesson.word : `${lesson.word} • sound soon`}</span></button>
          <div className="stage-switcher">
            <div className={stage === 'uppercase' ? 'is-active' : (!teacherMode ? 'is-done' : '')} onClick={teacherMode ? () => setTeacherStage('uppercase') : undefined}><span>1</span><strong>Uppercase (Заглавная)</strong><small>{lesson.uppercase.label}</small></div>
            <div className={stage === 'lowercase' ? 'is-active' : ''} onClick={teacherMode ? () => setTeacherStage('lowercase') : undefined}><span>2</span><strong>Lowercase (Строчная)</strong><small>{lesson.lowercase.label}</small></div>
          </div>
        </aside>

        <section className="trace-panel">
          <div className="trace-panel__header">
            <div><span className="card-kicker">{teacherMode ? 'Teacher test • ' : ''}{stage} practice ({stage === 'uppercase' ? 'Заглавная' : 'Строчная'} буква)</span><h2>Trace the letter (Обведи букву) <strong>{lesson[stage].label}</strong></h2></div>
            <button className="icon-button" onClick={() => setSoundOn((value) => !value)} aria-label="Toggle tracing sound">{soundOn ? <Volume2 /> : <VolumeX />}</button>
          </div>

          <TracingEngine key={`${lesson.key}-${stage}-${clearToken}`} lesson={lesson} stage={stage} disabled={locked} soundEnabled={soundOn} onResult={handleResult} />

          <div className="lesson-hud">
            <div className="success-counter"><span>Good spells (Успехи)</span><div>{Array.from({ length: lesson.requiredSuccesses }, (_, index) => <i key={index} className={index < successes ? 'is-lit' : ''}><WandSparkles /></i>)}</div><strong>{successes} / {lesson.requiredSuccesses}</strong></div>
            <div className="attempt-meter"><span>Attempts (Попытки)</span><div>{Array.from({ length: lesson.maxAttempts }, (_, index) => <i key={index} className={index < attemptsUsed ? 'is-used' : ''} />)}</div><strong>{attemptsUsed} / {lesson.maxAttempts}</strong></div>
            <button className="secondary-button" onClick={() => setClearToken((value) => value + 1)} disabled={locked}><RotateCcw size={18} /> Clear stroke (Очистить)</button>
          </div>

          {feedback && <div className={`feedback-toast ${feedback.success ? 'is-success' : 'is-try'}`}><strong>{feedback.accuracy}%</strong><span>{feedback.success ? 'Beautiful tracing! (Отлично!)' : 'Close! Stay near the silver path. (Почти! Держись ближе к серебряной линии.)'}</span></div>}
          {outOfAttempts && <div className="round-restart"><span>This practice round is complete. Take a breath and begin a fresh round. (Раунд завершён. Отдохни и начни новый.)</span><button className="primary-button" onClick={() => { if (teacherMode) setTeacherAttempts((previous) => ({ ...previous, [stage]: [] })); else resetStage(lesson.key, stage); setClearToken((value) => value + 1) }}><RotateCcw /> Start a new round (Новый раунд)</button></div>}
        </section>
      </section>

      <Modal open={completed && !teacherMode} label="Letter completed">
        <div className="completion-modal">
          <img src={chestOpen} alt="Open reward chest" />
          <span className="card-kicker">Letter mastered (Буква изучена)</span>
          <h2>Wonderful work, {currentStudent.name}! (Отличная работа!)</h2>
          <p>You completed uppercase <strong>{lesson.uppercase.label}</strong> and lowercase <strong>{lesson.lowercase.label}</strong>. The next letter is now waiting for you. (Ты завершил(а) заглавную и строчную буквы. Следующая буква уже доступна.)</p>
          <div className="completion-actions"><button className="secondary-button" onClick={() => navigate('/rewards')}>See rewards (Награды)</button><button className="primary-button" onClick={() => navigate('/menu')}>Continue journey (Продолжить)</button></div>
        </div>
      </Modal>
    </PageShell>
  )
}
