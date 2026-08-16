import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Award, Check, ChevronRight, LockKeyhole, LogOut, ShieldCheck, Sparkles } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { alphabetOrder, lessonByKey } from '../data/lessons'
import { completedLetters } from '../lib/scoring'
import { PageShell } from '../components/PageShell'
import { TopBar } from '../components/TopBar'
import { ProgressRing } from '../components/ProgressRing'
import { Modal } from '../components/Modal'
import { Logo } from '../components/Logo'

export function MenuPage() {
  const { currentStudent, selectStudent, teacherMode, exitTeacherMode } = useApp()
  const navigate = useNavigate()
  const [pendingLetter, setPendingLetter] = useState<string | null>(null)
  if (!currentStudent) return null
  const completeCount = completedLetters(currentStudent)

  return (
    <PageShell className="menu-page">
      <TopBar hideBrand />
      <section className="menu-dashboard">
        <div className="menu-dashboard__main">
          <div className="menu-dashboard__top"><Logo compact /><span className="hero-badge"><Sparkles size={16} /> Welcome back, {currentStudent.name} (С возвращением)</span></div>
          <h1><span className="title-en">Your letter journey</span><small className="title-ru">(Твоё путешествие по буквам)</small></h1>
          <p className="menu-intro">
            <span>Choose the next glowing letter and keep your handwriting spell growing.</span>
            <span className="menu-intro__ru">(Выбери следующую светящуюся букву и продолжай учиться писать.)</span>
          </p>
        </div>
        <div className="menu-dashboard__side">
          <div className="menu-progress-card">
            <ProgressRing value={Math.round((completeCount / alphabetOrder.length) * 100)} label="alphabet (алфавит)" />
            <div><strong>{completeCount} of {alphabetOrder.length} (из {alphabetOrder.length})</strong><span>letters mastered (букв изучено)</span><small>Group (Группа) {currentStudent.group}</small></div>
          </div>
          <nav className="quick-actions quick-actions--compact" aria-label="Student actions (Действия ученика)">
            <button onClick={() => navigate('/rewards')}><span className="quick-icon quick-icon--gold"><Award /></span><span><strong>My rewards (Мои награды)</strong><small>Magical collection (Коллекция)</small></span><ChevronRight /></button>
            <button onClick={() => navigate('/teacher')}><span className="quick-icon"><ShieldCheck /></span><span><strong>{teacherMode ? 'Teacher dashboard (Кабинет учителя)' : 'Teacher mode (Режим учителя)'}</strong><small>{teacherMode ? 'Class progress (Прогресс класса)' : 'PIN protected (Вход по PIN)'}</small></span><ChevronRight /></button>
            <button onClick={() => { exitTeacherMode(); selectStudent(null); navigate('/') }}><span className="quick-icon quick-icon--soft"><LogOut /></span><span><strong>Switch student (Сменить ученика)</strong><small>Profiles (Профили)</small></span><ChevronRight /></button>
          </nav>
        </div>
      </section>

      {teacherMode && <div className="teacher-mode-banner"><ShieldCheck /><span><strong>Teacher test mode (Режим проверки учителя)</strong><small>All letter cards are open; test attempts do not change the child’s progress. (Все карточки открыты; проверка не меняет прогресс ребёнка.)</small></span><button onClick={exitTeacherMode}>Exit (Выйти)</button></div>}

      <section className="letter-section">
        <div className="section-heading"><div><span className="card-kicker">Phonics path (Путь звуков)</span><h2><span className="title-en">Alphabet lessons</span><small className="title-ru">(Уроки алфавита)</small></h2></div><div className="legend"><span><i className="legend-dot legend-dot--done" />Mastered (Изучено)</span><span><i className="legend-dot legend-dot--ready" />Ready (Доступно)</span><span><i className="legend-dot" />Locked (Закрыто)</span></div></div>
        <motion.div className="letter-grid" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.025 } } }}>
          {alphabetOrder.map((letter, index) => {
            const completed = Boolean(currentStudent.progress[letter as 's' | 'i' | 't']?.completed)
            const unlocked = index === 0 || alphabetOrder.slice(0, index).every((prior) => currentStudent.progress[prior as 's' | 'i' | 't']?.completed)
            const available = Boolean(lessonByKey[letter])
            const open = teacherMode || unlocked
            const playable = teacherMode || (unlocked && available)
            return (
              <motion.button
                variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                key={letter}
                className={`letter-card ${completed ? 'letter-card--done' : playable ? 'letter-card--ready' : ''}`}
                disabled={!playable}
                onClick={() => available ? navigate(`/lesson/${letter}`) : setPendingLetter(letter)}
                aria-label={`${letter.toUpperCase()} ${completed ? 'mastered' : playable ? 'ready' : 'locked'}`}
              >
                <span className="letter-number">{String(index + 1).padStart(2, '0')}</span>
                <strong>{letter.toUpperCase()}<small>{letter}</small></strong>
                <span className="letter-status">{completed ? <Check /> : playable ? <Sparkles /> : <LockKeyhole />}</span>
                {!available && open && <em>config soon</em>}
              </motion.button>
            )
          })}
        </motion.div>
      </section>
      <Modal open={Boolean(pendingLetter)} onClose={() => setPendingLetter(null)} label="Lesson configuration">
        <div className="completion-modal placeholder-modal"><ShieldCheck /><span className="card-kicker">Teacher test mode (Режим учителя)</span><h2>Letter {pendingLetter?.toUpperCase()} is open (Буква открыта)</h2><p>The card is available for navigation testing, but its handwriting path has not been migrated yet. (Карточка доступна для проверки навигации, но траектория письма ещё не перенесена.)</p><button className="primary-button" onClick={() => setPendingLetter(null)}>Close (Закрыть)</button></div>
      </Modal>
    </PageShell>
  )
}
