import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AppData, AppSettings, Attempt, LessonProgress, LetterKey, StageKind, Student } from '../types'
import { defaultData, loadData, saveData } from '../lib/storage'
import { earnedBadgeIds } from '../lib/rewards'

interface AppContextValue {
  data: AppData
  currentStudent: Student | null
  teacherMode: boolean
  registerStudent: (name: string, group: string) => Student
  selectStudent: (id: string | null) => void
  enterTeacherMode: (pin: string) => Promise<boolean>
  exitTeacherMode: () => void
  recordAttempt: (letter: LetterKey, stage: StageKind, accuracy: number, success: boolean) => Student | null
  resetStage: (letter: LetterKey, stage: StageKind) => void
  resetCurrentProgress: () => void
  updateSettings: (settings: Partial<AppSettings>) => void
  clearDemoData: () => void
}

const AppContext = createContext<AppContextValue | null>(null)
const TEACHER_PIN_DIGEST = 'bc4f831d774b13d4a20f1461ef2abc3543ceb2fd95937efac05fe2c9231d0519'

async function pinDigest(pin: string) {
  const bytes = new TextEncoder().encode(pin)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

const emptyLessonProgress = (letter: LetterKey): LessonProgress => ({
  letter,
  completed: false,
  uppercase: { completed: false, attempts: [], bestAccuracy: 0 },
  lowercase: { completed: false, attempts: [], bestAccuracy: 0 },
})

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => typeof window === 'undefined' ? defaultData : loadData())
  const [teacherMode, setTeacherMode] = useState(() => sessionStorage.getItem('learn_letters_teacher_mode') === 'true')

  useEffect(() => saveData(data), [data])

  const currentStudent = data.students.find((student) => student.id === data.currentStudentId) ?? null

  const registerStudent = useCallback((rawName: string, rawGroup: string) => {
    const name = rawName.trim()
    const group = rawGroup.trim()
    const existing = data.students.find((student) => student.name.toLocaleLowerCase() === name.toLocaleLowerCase()
      && student.group.toLocaleLowerCase() === group.toLocaleLowerCase())
    if (existing) {
      setData((previous) => ({ ...previous, currentStudentId: existing.id }))
      return existing
    }
    const student: Student = {
      id: crypto.randomUUID(),
      name,
      group,
      createdAt: new Date().toISOString(),
      progress: {},
      badges: [],
    }
    setData((previous) => ({ ...previous, students: [...previous.students, student], currentStudentId: student.id }))
    return student
  }, [data.students])

  const selectStudent = useCallback((id: string | null) => {
    setData((previous) => ({ ...previous, currentStudentId: id }))
  }, [])

  const enterTeacherMode = useCallback(async (pin: string) => {
    if (await pinDigest(pin) !== TEACHER_PIN_DIGEST) return false
    sessionStorage.setItem('learn_letters_teacher_mode', 'true')
    setTeacherMode(true)
    return true
  }, [])

  const exitTeacherMode = useCallback(() => {
    sessionStorage.removeItem('learn_letters_teacher_mode')
    setTeacherMode(false)
  }, [])

  const recordAttempt = useCallback((letter: LetterKey, stage: StageKind, accuracy: number, success: boolean) => {
    let updatedStudent: Student | null = null
    setData((previous) => {
      const students = previous.students.map((student) => {
        if (student.id !== previous.currentStudentId) return student
        const lesson = structuredClone(student.progress[letter] ?? emptyLessonProgress(letter))
        const currentStage = lesson[stage]
        const attempt: Attempt = {
          id: crypto.randomUUID(),
          letter,
          stage,
          accuracy,
          success,
          attemptNumber: currentStage.attempts.length + 1,
          createdAt: new Date().toISOString(),
        }
        currentStage.attempts.push(attempt)
        currentStage.bestAccuracy = Math.max(currentStage.bestAccuracy, accuracy)
        const roundAttempts = currentStage.attempts.slice(currentStage.roundStartIndex ?? 0)
        currentStage.completed = roundAttempts.filter((item) => item.success).length >= 3
        lesson.completed = lesson.uppercase.completed && lesson.lowercase.completed
        if (lesson.completed && !lesson.completedAt) lesson.completedAt = new Date().toISOString()
        const nextStudent = { ...student, progress: { ...student.progress, [letter]: lesson } }
        const ids = earnedBadgeIds(nextStudent)
        nextStudent.badges = ids.map((badgeId) => student.badges.find((award) => award.badgeId === badgeId)
          ?? { badgeId, awardedAt: new Date().toISOString() })
        updatedStudent = nextStudent
        return nextStudent
      })
      return { ...previous, students }
    })
    return updatedStudent
  }, [])

  const resetStage = useCallback((letter: LetterKey, stage: StageKind) => {
    setData((previous) => ({
      ...previous,
      students: previous.students.map((student) => {
        if (student.id !== previous.currentStudentId || !student.progress[letter]) return student
        const lesson = structuredClone(student.progress[letter]!)
        lesson[stage] = {
          ...lesson[stage],
          completed: false,
          roundStartIndex: lesson[stage].attempts.length,
        }
        lesson.completed = false
        lesson.completedAt = undefined
        return { ...student, progress: { ...student.progress, [letter]: lesson } }
      }),
    }))
  }, [])

  const updateSettings = useCallback((settings: Partial<AppSettings>) => {
    setData((previous) => ({ ...previous, settings: { ...previous.settings, ...settings } }))
  }, [])

  const resetCurrentProgress = useCallback(() => {
    setData((previous) => ({
      ...previous,
      students: previous.students.map((student) => student.id === previous.currentStudentId
        ? { ...student, progress: {}, badges: [] }
        : student),
    }))
  }, [])

  const clearDemoData = useCallback(() => setData(defaultData), [])

  const value = useMemo(() => ({ data, currentStudent, teacherMode, registerStudent, selectStudent, enterTeacherMode, exitTeacherMode, recordAttempt, resetStage, resetCurrentProgress, updateSettings, clearDemoData }),
    [data, currentStudent, teacherMode, registerStudent, selectStudent, enterTeacherMode, exitTeacherMode, recordAttempt, resetStage, resetCurrentProgress, updateSettings, clearDemoData])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used inside AppProvider')
  return context
}
