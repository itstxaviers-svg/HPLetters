import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight, GraduationCap, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { PageShell } from '../components/PageShell'
import { Logo } from '../components/Logo'

export function WelcomePage() {
  const { data, registerStudent, selectStudent } = useApp()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [group, setGroup] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim() || !group.trim()) return
    registerStudent(name, group)
    navigate('/menu')
  }

  return (
    <PageShell className="welcome-page">
      <section className="welcome-layout">
        <div className="welcome-copy">
          <Logo />
          <div className="hero-badge"><Sparkles size={16} /> A bright place to practise (Светлое место для занятий)</div>
          <h1>Every letter begins with a little <em>magic.</em> <small className="title-ru">(Каждая буква начинается с волшебства.)</small></h1>
          <p>Listen to each sound, follow the glowing path, and build confident handwriting one stroke at a time. (Слушай звук, следуй по светящейся линии и учись писать шаг за шагом.)</p>
          <div className="feature-row">
            <span><span className="feature-icon"><GraduationCap /></span><strong>Learn (Учись)</strong><small>Clear guided stages (Понятные этапы)</small></span>
            <span><span className="feature-icon"><Sparkles /></span><strong>Practise (Тренируйся)</strong><small>Kind, honest feedback (Честная поддержка)</small></span>
            <span><span className="feature-icon"><Users /></span><strong>Grow (Развивайся)</strong><small>Progress for each child (Личный прогресс)</small></span>
          </div>
        </div>

        <motion.div className="parchment-card registration-card" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
          <span className="card-kicker">Student spellbook (Книга ученика)</span>
          <h2><span className="title-en">Start your journey</span><small className="title-ru">(Начни обучение)</small></h2>
          <p>Enter your name and class group. We’ll remember your progress on this device. (Введи имя и группу — прогресс сохранится на этом устройстве.)</p>
          <form onSubmit={submit}>
            <label>Student name (Имя ученика)<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Maya (например, Маша)" autoComplete="name" required /></label>
            <label>Group (Группа)<input value={group} onChange={(event) => setGroup(event.target.value)} placeholder="e.g. 2A (например, 2А)" required /></label>
            <button className="primary-button" type="submit">Open my spellbook (Открыть книгу) <ArrowRight size={19} /></button>
          </form>

          {data.students.length > 0 && (
            <div className="saved-students">
              <div className="section-divider"><span>or continue (или продолжить)</span></div>
              <div className="profile-chips">
                {data.students.slice(0, 4).map((student) => (
                  <button key={student.id} onClick={() => { selectStudent(student.id); navigate('/menu') }}>
                    <span>{student.name.slice(0, 1).toUpperCase()}</span><span><strong>{student.name}</strong><small>Group (Группа) {student.group}</small></span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <button className="teacher-entry" type="button" onClick={() => navigate('/teacher')}><ShieldCheck /> Teacher area (Кабинет учителя)</button>
        </motion.div>
      </section>
    </PageShell>
  )
}
