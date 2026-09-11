import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight, GraduationCap, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { PageShell } from '../components/PageShell'
import { Logo } from '../components/Logo'

function studentConnectionError(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  if (/class not found/i.test(message)) return 'Class not found. Check the Join Code. (Группа не найдена. Проверьте код класса.)'
  if (/belongs to another class/i.test(message)) return 'This profile belongs to another class. (Этот профиль относится к другой группе.)'
  return 'Could not connect to the class. Check the internet and try again. (Не удалось подключиться к группе. Проверьте интернет и повторите.)'
}

export function WelcomePage() {
  const { data, registerStudent } = useApp()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [group, setGroup] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [registrationError, setRegistrationError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim() || !group.trim()) return
    setSubmitting(true)
    setRegistrationError('')
    try {
      await registerStudent(name, group)
      navigate('/menu')
    } catch (error) {
      setRegistrationError(studentConnectionError(error))
    } finally {
      setSubmitting(false)
    }
  }

  const resumeStudent = async (student: (typeof data.students)[number]) => {
    setSubmitting(true)
    setRegistrationError('')
    try {
      await registerStudent(student.name, student.group)
      navigate('/menu')
    } catch (error) {
      setRegistrationError(studentConnectionError(error))
    } finally {
      setSubmitting(false)
    }
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
          <p>Enter your name and class Join Code. Your progress is saved on this device and, when cloud sync is connected, in the teacher dashboard. (Введи имя и код класса. Прогресс сохранится на устройстве, а после подключения облака — у учителя.)</p>
          <form onSubmit={submit}>
            <label>Student name (Имя ученика)<input value={name} onChange={(event) => { setName(event.target.value); setRegistrationError('') }} placeholder="e.g. Maya (например, Маша)" autoComplete="name" required disabled={submitting} /></label>
            <label>Group / Join Code (Группа / код класса)<input value={group} onChange={(event) => { setGroup(event.target.value.toUpperCase()); setRegistrationError('') }} placeholder="e.g. LETTERS-2A" required disabled={submitting} /></label>
            <button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Connecting… (Подключаемся…)' : 'Open my spellbook (Открыть книгу)'} {!submitting && <ArrowRight size={19} />}</button>
            {registrationError && <span className="form-error" role="alert">{registrationError}</span>}
          </form>

          {data.students.length > 0 && (
            <div className="saved-students">
              <div className="section-divider"><span>or continue (или продолжить)</span></div>
              <div className="profile-chips">
                {data.students.slice(0, 4).map((student) => (
                  <button key={student.id} onClick={() => void resumeStudent(student)} disabled={submitting}>
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
