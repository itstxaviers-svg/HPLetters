import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Award, BarChart3, ChevronDown, ChevronUp, Crown, LockKeyhole, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { allAttempts, averageAccuracy, competitionScore, completedLetters, completionPercent, isTrueTie, rankStudents } from '../lib/scoring'
import { badges } from '../data/badges'
import { PageShell } from '../components/PageShell'
import { TopBar } from '../components/TopBar'
import trophy from '../assets/rewards/trophy-class-winner.webp'

export function TeacherPage() {
  const { data, currentStudent, teacherMode, enterTeacherMode } = useApp()
  const navigate = useNavigate()
  const [unlocked, setUnlocked] = useState(teacherMode)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [group, setGroup] = useState(data.students[0]?.group ?? 'All groups')
  const [expanded, setExpanded] = useState<string | null>(null)

  const groups = useMemo(() => [...new Set(data.students.map((student) => student.group))], [data.students])
  const visibleStudents = group === 'All groups' ? data.students : data.students.filter((student) => student.group === group)
  const ranked = rankStudents(visibleStudents)
  const hasCompetition = ranked.some((student) => allAttempts(student).length > 0)
  const tie = hasCompetition && isTrueTie(ranked[0], ranked[1])
  const winner = hasCompetition && !tie ? ranked[0] : undefined

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (await enterTeacherMode(pin)) setUnlocked(true)
    else setError(true)
  }

  if (!unlocked) {
    return (
      <PageShell variant="teacher">
        <TopBar backTo={currentStudent ? '/menu' : '/'} backLabel="Student area (Для ученика)" minimal />
        <section className="teacher-gate parchment-card">
          <span className="gate-icon"><LockKeyhole /></span>
          <span className="card-kicker">Grown-ups only (Только для взрослых)</span>
          <h1><span className="title-en">Teacher area</span><small className="title-ru">(Кабинет учителя)</small></h1>
          <p>Enter the teacher PIN to view student progress. (Введите PIN учителя, чтобы увидеть прогресс учеников.)</p>
          <form onSubmit={submit}><input value={pin} onChange={(event) => { setPin(event.target.value.replace(/\D/g, '').slice(0, 8)); setError(false) }} inputMode="numeric" placeholder="••••••••" aria-label="Teacher PIN (PIN учителя)" autoFocus /><button className="primary-button">Unlock dashboard (Открыть кабинет)</button></form>
          {error && <span className="form-error">That PIN did not match. Try again. (Неверный PIN. Попробуйте ещё раз.)</span>}
        </section>
      </PageShell>
    )
  }

  if (!data.students.length) {
    return (
      <PageShell variant="teacher">
        <TopBar backTo="/" backLabel="Registration (Регистрация)" minimal />
        <section className="teacher-gate parchment-card"><span className="gate-icon"><Users /></span><h1><span className="title-en">No students yet</span><small className="title-ru">(Учеников пока нет)</small></h1><p>Create the first student profile to begin collecting progress. (Создайте первый профиль ученика, чтобы начать собирать статистику.)</p></section>
      </PageShell>
    )
  }

  const totalCompleted = visibleStudents.reduce((sum, student) => sum + completedLetters(student), 0)
  const classAccuracy = visibleStudents.length ? visibleStudents.reduce((sum, student) => sum + averageAccuracy(student), 0) / visibleStudents.length : 0

  return (
    <PageShell variant="teacher">
      <TopBar backTo={currentStudent ? '/menu' : '/'} backLabel="Student area (Для ученика)" />
      <section className="dashboard-heading">
        <div><span className="hero-badge"><ShieldCheck /> Teacher dashboard (Кабинет учителя)</span><h1><span className="title-en">Class progress</span><small className="title-ru">(Прогресс класса)</small></h1><p>See growth, celebrate careful practice, and find where support will help most. (Следите за ростом и замечайте, кому нужна поддержка.)</p></div>
        <div className="teacher-controls">
          <label>View group (Группа)<select value={group} onChange={(event) => setGroup(event.target.value)}><option value="All groups">All groups (Все группы)</option>{groups.map((item) => <option key={item}>{item}</option>)}</select></label>
          {currentStudent && <button className="secondary-button" onClick={() => navigate('/menu')}>Check letters (Проверить буквы)</button>}
        </div>
      </section>

      <section className="metric-grid">
        <article><span><Users /></span><div><small>Students (Ученики)</small><strong>{visibleStudents.length}</strong></div></article>
        <article><span><BarChart3 /></span><div><small>Letters completed (Букв изучено)</small><strong>{totalCompleted}</strong></div></article>
        <article><span><Sparkles /></span><div><small>Average accuracy (Средняя точность)</small><strong>{Math.round(classAccuracy)}%</strong></div></article>
        <article><span><Award /></span><div><small>Badges earned (Награды)</small><strong>{visibleStudents.reduce((sum, student) => sum + student.badges.length, 0)}</strong></div></article>
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-panel ranking-panel">
          <div className="panel-heading"><div><span className="card-kicker">Honest ranking (Честный рейтинг)</span><h2><span className="title-en">Student progress</span><small className="title-ru">(Прогресс учеников)</small></h2></div><small>Quality + early success (Качество + быстрый успех)</small></div>
          <div className="student-table">
            <div className="student-row student-row--header"><span>Rank / student (Место / ученик)</span><span>Progress (Прогресс)</span><span>Accuracy (Точность)</span><span>Score (Баллы)</span><span /></div>
            {ranked.map((student, index) => {
              const isExpanded = expanded === student.id
              return (
                <div className="student-record" key={student.id}>
                  <button className="student-row" onClick={() => setExpanded(isExpanded ? null : student.id)}>
                    <span className="student-identity"><i>{index + 1}</i><b>{student.name.slice(0, 1).toUpperCase()}</b><span><strong>{student.name}</strong><small>Group (Группа) {student.group}</small></span>{winner?.id === student.id && <Crown className="winner-crown" />}</span>
                    <span><strong>{completedLetters(student)} letters (букв)</strong><small>{completionPercent(student)}% of alphabet (алфавита)</small></span>
                    <span><strong>{Math.round(averageAccuracy(student))}%</strong><small>successful tries (успешные попытки)</small></span>
                    <span><strong>{competitionScore(student).toFixed(1)}</strong><small>competition (рейтинг)</small></span>
                    <span>{isExpanded ? <ChevronUp /> : <ChevronDown />}</span>
                  </button>
                  {isExpanded && (
                    <div className="student-detail">
                      <div><h3>Letter breakdown (По буквам)</h3>{Object.values(student.progress).filter(Boolean).map((progress) => <p key={progress!.letter}><strong>{progress!.letter.toUpperCase()}</strong><span>Uppercase (Заглавная) {progress!.uppercase.bestAccuracy}%</span><span>Lowercase (Строчная) {progress!.lowercase.bestAccuracy}%</span><span>{progress!.uppercase.attempts.length + progress!.lowercase.attempts.length} attempts (попыток)</span></p>)}</div>
                      <div><h3>Earned rewards (Награды)</h3><div className="mini-badges">{student.badges.length ? student.badges.map((award) => { const badge = badges.find((item) => item.id === award.badgeId); return badge && <span key={award.badgeId}><img src={badge.image} alt="" />{badge.title}</span> }) : <small>No badges yet — the first one is close. (Наград пока нет — первая уже близко.)</small>}</div></div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </article>

        <aside className="winner-panel">
          <span className="card-kicker">Class distinction (Лидер класса)</span>
          {tie ? <><div className="winner-glow"><ShieldCheck /></div><h2>Teacher tie-break needed (Нужен дополнительный раунд)</h2><p>The leading students are equal on score, accuracy, and clean completions. Run a short supervised tracing round. (У лидеров равные результаты. Проведите короткий дополнительный раунд.)</p></> : winner ? <><img src={trophy} alt="Class winner trophy" /><h2>{winner.name}</h2><span className="winner-title"><Crown /> Current class leader (Лидер класса)</span><p>{competitionScore(winner).toFixed(1)} points with {Math.round(averageAccuracy(winner))}% average accuracy. ({competitionScore(winner).toFixed(1)} баллов, средняя точность {Math.round(averageAccuracy(winner))}%.)</p></> : <><div className="winner-glow"><Crown /></div><h2>No leader yet (Лидера пока нет)</h2><p>Complete a lesson to begin the ranking. (Рейтинг появится после первого урока.)</p></>}
        </aside>
      </section>
    </PageShell>
  )
}
