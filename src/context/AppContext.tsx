import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AppData, AppSettings, Attempt, LessonProgress, LetterKey, StageKind, Student } from '../types'
import { defaultData, loadData, saveData } from '../lib/storage'
import { earnedBadgeIds } from '../lib/rewards'
import { clearTeacherCloudSession, CloudRequestError, cloudSyncEnabled, connectStudentCloud, deleteStudentAccountCloud, fetchTeacherStudentsCloud, loginTeacherCloud, resetStudentResultsCloud, syncStudentCloud, type SyncStatus } from '../lib/cloud'

export type TeacherDataStatus = 'idle' | 'loading' | 'ready' | 'error'

interface AppContextValue {
  data: AppData
  currentStudent: Student | null
  teacherMode: boolean
  teacherStudents: Student[] | null
  teacherDataStatus: TeacherDataStatus
  teacherLastUpdatedAt: string | null
  syncStatus: SyncStatus
  cloudSyncEnabled: boolean
  registerStudent: (name: string, group: string) => Promise<Student>
  selectStudent: (id: string | null) => void
  enterTeacherMode: (pin: string) => Promise<boolean>
  refreshTeacherStudents: () => Promise<boolean>
  resetTeacherStudent: (studentId: string) => Promise<boolean>
  deleteTeacherStudent: (studentId: string) => Promise<boolean>
  exitTeacherMode: () => void
  recordAttempt: (letter: LetterKey, stage: StageKind, accuracy: number, success: boolean) => Student | null
  resetStage: (letter: LetterKey, stage: StageKind) => void
  resetCurrentProgress: () => void
  updateSettings: (settings: Partial<AppSettings>) => void
  clearDemoData: () => void
}

const AppContext = createContext<AppContextValue | null>(null)
const TEACHER_PIN_DIGEST = '1950fe84f8d0a2addb4443369565f08f79230dd3e4a1164afee072a2f1e02a80'

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
  const [teacherStudents, setTeacherStudents] = useState<Student[] | null>(null)
  const [teacherDataStatus, setTeacherDataStatus] = useState<TeacherDataStatus>('idle')
  const [teacherLastUpdatedAt, setTeacherLastUpdatedAt] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => cloudSyncEnabled ? 'syncing' : 'local')
  const syncGenerationRef = useRef(0)
  const teacherRefreshRef = useRef<Promise<boolean> | null>(null)

  useEffect(() => saveData(data), [data])

  const currentStudent = data.students.find((student) => student.id === data.currentStudentId) ?? null

  useEffect(() => {
    const generation = ++syncGenerationRef.current
    if (!cloudSyncEnabled || !currentStudent || teacherMode) return
    const timer = window.setTimeout(() => {
      setSyncStatus('syncing')
      void syncStudentCloud(currentStudent)
        .then((remoteStudent) => {
          if (syncGenerationRef.current !== generation) return
          if (remoteStudent) {
            setData((previous) => ({
              ...previous,
              students: previous.students.map((student) => student.id === remoteStudent.id
                ? { ...remoteStudent, name: student.name, group: student.group, createdAt: student.createdAt }
                : student),
            }))
          }
          setSyncStatus('synced')
        })
        .catch((error) => {
          if (syncGenerationRef.current !== generation) return
          if (error instanceof CloudRequestError && error.status === 410) {
            setData((previous) => ({
              ...previous,
              students: previous.students.filter((student) => student.id !== currentStudent.id),
              currentStudentId: previous.currentStudentId === currentStudent.id ? null : previous.currentStudentId,
            }))
            setSyncStatus('synced')
            return
          }
          setSyncStatus('error')
        })
    }, 900)
    return () => window.clearTimeout(timer)
  }, [currentStudent, teacherMode])

  const refreshTeacherStudents = useCallback(() => {
    if (teacherRefreshRef.current) return teacherRefreshRef.current
    if (!cloudSyncEnabled) {
      setTeacherDataStatus('ready')
      return Promise.resolve(true)
    }
    const refresh = (async () => {
      setTeacherDataStatus('loading')
      try {
        const cloudStudents = await fetchTeacherStudentsCloud()
        setTeacherStudents(cloudStudents)
        setTeacherLastUpdatedAt(new Date().toISOString())
        setTeacherDataStatus('ready')
        return true
      } catch (error) {
        if (error instanceof CloudRequestError && error.status === 401) {
          sessionStorage.removeItem('learn_letters_teacher_mode')
          clearTeacherCloudSession()
          setTeacherMode(false)
          setTeacherStudents(null)
          setTeacherDataStatus('idle')
        } else {
          setTeacherDataStatus('error')
        }
        return false
      }
    })()
    teacherRefreshRef.current = refresh
    void refresh.finally(() => {
      if (teacherRefreshRef.current === refresh) teacherRefreshRef.current = null
    })
    return refresh
  }, [])

  const registerStudent = useCallback(async (rawName: string, rawGroup: string) => {
    const name = rawName.trim()
    const group = rawGroup.trim()
    const existing = data.students.find((student) => student.name.toLocaleLowerCase() === name.toLocaleLowerCase()
      && student.group.toLocaleLowerCase() === group.toLocaleLowerCase())
    if (existing) {
      if (cloudSyncEnabled) {
        setSyncStatus('syncing')
        try {
          await connectStudentCloud(existing)
        } catch (error) {
          setSyncStatus('error')
          throw error
        }
      }
      setData((previous) => ({ ...previous, currentStudentId: existing.id }))
      return existing
    }
    const now = new Date().toISOString()
    const student: Student = {
      id: crypto.randomUUID(),
      name,
      group,
      createdAt: now,
      updatedAt: now,
      progress: {},
      badges: [],
    }
    if (cloudSyncEnabled) {
      setSyncStatus('syncing')
      try {
        await connectStudentCloud(student)
      } catch (error) {
        setSyncStatus('error')
        throw error
      }
    }
    setData((previous) => ({ ...previous, students: [...previous.students, student], currentStudentId: student.id }))
    return student
  }, [data.students])

  const selectStudent = useCallback((id: string | null) => {
    setData((previous) => ({ ...previous, currentStudentId: id }))
  }, [])

  const enterTeacherMode = useCallback(async (pin: string) => {
    if (cloudSyncEnabled) {
      try {
        const cloudStudents = await loginTeacherCloud(pin)
        setTeacherStudents(cloudStudents)
        setTeacherLastUpdatedAt(new Date().toISOString())
        setTeacherDataStatus('ready')
        sessionStorage.setItem('learn_letters_teacher_mode', 'true')
        setTeacherMode(true)
        return true
      } catch {
        return false
      }
    }
    if (await pinDigest(pin) !== TEACHER_PIN_DIGEST) return false
    sessionStorage.setItem('learn_letters_teacher_mode', 'true')
    setTeacherMode(true)
    return true
  }, [])

  const exitTeacherMode = useCallback(() => {
    sessionStorage.removeItem('learn_letters_teacher_mode')
    clearTeacherCloudSession()
    setTeacherStudents(null)
    setTeacherDataStatus('idle')
    setTeacherLastUpdatedAt(null)
    setTeacherMode(false)
  }, [])

  const resetTeacherStudent = useCallback(async (studentId: string) => {
    try {
      const resetStudent = cloudSyncEnabled
        ? await resetStudentResultsCloud(studentId)
        : (() => {
            const student = data.students.find((item) => item.id === studentId)
            return student ? { ...student, updatedAt: new Date().toISOString(), progress: {}, badges: [] } : null
          })()
      if (!resetStudent) return false
      setTeacherStudents((previous) => previous?.map((student) => student.id === studentId ? resetStudent : student) ?? previous)
      setData((previous) => ({
        ...previous,
        students: previous.students.map((student) => student.id === studentId
          ? { ...resetStudent, name: student.name, group: student.group, createdAt: student.createdAt }
          : student),
      }))
      setTeacherLastUpdatedAt(new Date().toISOString())
      return true
    } catch (error) {
      if (error instanceof CloudRequestError && error.status === 401) exitTeacherMode()
      return false
    }
  }, [data.students, exitTeacherMode])

  const deleteTeacherStudent = useCallback(async (studentId: string) => {
    try {
      if (cloudSyncEnabled) await deleteStudentAccountCloud(studentId)
      setTeacherStudents((previous) => previous?.filter((student) => student.id !== studentId) ?? previous)
      setData((previous) => ({
        ...previous,
        students: previous.students.filter((student) => student.id !== studentId),
        currentStudentId: previous.currentStudentId === studentId ? null : previous.currentStudentId,
      }))
      setTeacherLastUpdatedAt(new Date().toISOString())
      return true
    } catch (error) {
      if (error instanceof CloudRequestError && error.status === 401) exitTeacherMode()
      return false
    }
  }, [exitTeacherMode])

  const recordAttempt = useCallback((letter: LetterKey, stage: StageKind, accuracy: number, success: boolean) => {
    let updatedStudent: Student | null = null
    if (cloudSyncEnabled) setSyncStatus('syncing')
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
        const nextStudent = { ...student, updatedAt: new Date().toISOString(), progress: { ...student.progress, [letter]: lesson } }
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
    if (cloudSyncEnabled) setSyncStatus('syncing')
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
        return { ...student, updatedAt: new Date().toISOString(), progress: { ...student.progress, [letter]: lesson } }
      }),
    }))
  }, [])

  const updateSettings = useCallback((settings: Partial<AppSettings>) => {
    setData((previous) => ({ ...previous, settings: { ...previous.settings, ...settings } }))
  }, [])

  const resetCurrentProgress = useCallback(() => {
    if (cloudSyncEnabled) setSyncStatus('syncing')
    setData((previous) => ({
      ...previous,
      students: previous.students.map((student) => student.id === previous.currentStudentId
        ? { ...student, updatedAt: new Date().toISOString(), progress: {}, badges: [] }
        : student),
    }))
  }, [])

  const clearDemoData = useCallback(() => setData(defaultData), [])

  const value = useMemo(() => ({ data, currentStudent, teacherMode, teacherStudents, teacherDataStatus, teacherLastUpdatedAt, syncStatus, cloudSyncEnabled, registerStudent, selectStudent, enterTeacherMode, refreshTeacherStudents, resetTeacherStudent, deleteTeacherStudent, exitTeacherMode, recordAttempt, resetStage, resetCurrentProgress, updateSettings, clearDemoData }),
    [data, currentStudent, teacherMode, teacherStudents, teacherDataStatus, teacherLastUpdatedAt, syncStatus, registerStudent, selectStudent, enterTeacherMode, refreshTeacherStudents, resetTeacherStudent, deleteTeacherStudent, exitTeacherMode, recordAttempt, resetStage, resetCurrentProgress, updateSettings, clearDemoData])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used inside AppProvider')
  return context
}
