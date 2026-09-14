import type { Student } from '../types'

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'error'

interface CloudSession {
  token: string
  role: 'student' | 'teacher'
  subjectId: string
  expiresAt: string
}

interface RegisterResponse {
  session: CloudSession
  groupName: string
}

interface TeacherStudentsResponse {
  students: Student[]
}

const API_BASE = (import.meta.env.VITE_YANDEX_API_URL ?? '').trim().replace(/\/$/, '')
const STUDENT_SESSION_PREFIX = 'learn_letters_cloud_student_'
const TEACHER_SESSION_KEY = 'learn_letters_cloud_teacher'
const studentSyncQueues = new Map<string, Promise<Student | null>>()

export const cloudSyncEnabled = Boolean(API_BASE)

export class CloudRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

function validSession(session: CloudSession | null): session is CloudSession {
  return Boolean(session?.token && new Date(session.expiresAt).getTime() > Date.now() + 60_000)
}

function readSession(storage: Storage, key: string): CloudSession | null {
  try {
    const session = JSON.parse(storage.getItem(key) ?? 'null') as CloudSession | null
    return validSession(session) ? session : null
  } catch {
    return null
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!API_BASE) throw new Error('Cloud sync is not configured.')
  const controller = options.signal ? null : new AbortController()
  const timeout = controller ? window.setTimeout(() => controller.abort(), 15_000) : null
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: options.signal ?? controller?.signal,
      headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    })
    const body = await response.json().catch(() => ({})) as { message?: string }
    if (!response.ok) throw new CloudRequestError(body.message || `Cloud request failed (${response.status}).`, response.status)
    return body as T
  } finally {
    if (timeout !== null) window.clearTimeout(timeout)
  }
}

async function ensureStudentSession(student: Student): Promise<CloudSession> {
  const key = `${STUDENT_SESSION_PREFIX}${student.id}`
  const saved = readSession(localStorage, key)
  if (saved) return saved
  const response = await request<RegisterResponse>('/student/register', {
    method: 'POST',
    body: JSON.stringify({ studentId: student.id, displayName: student.name, joinCode: student.group }),
  })
  localStorage.setItem(key, JSON.stringify(response.session))
  return response.session
}

export async function connectStudentCloud(student: Student): Promise<void> {
  await ensureStudentSession(student)
}

async function sendStudentSnapshot(student: Student): Promise<Student | null> {
  const session = await ensureStudentSession(student)
  try {
    const response = await request<{ ok: true; student?: Student }>('/student/sync', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.token}` },
      body: JSON.stringify({ student }),
    })
    return response.student ?? null
  } catch (error) {
    if (error instanceof CloudRequestError && (error.status === 401 || error.status === 410)) {
      localStorage.removeItem(`${STUDENT_SESSION_PREFIX}${student.id}`)
    }
    throw error
  }
}

export function syncStudentCloud(student: Student): Promise<Student | null> {
  // Keep snapshots for one pupil strictly ordered. Without this queue an older,
  // slower request can finish after a newer one and roll cloud progress back.
  const snapshot = structuredClone(student)
  const previous = studentSyncQueues.get(student.id) ?? Promise.resolve<Student | null>(null)
  const queued = previous.catch(() => undefined).then(() => sendStudentSnapshot(snapshot))
  studentSyncQueues.set(student.id, queued)
  void queued.finally(() => {
    if (studentSyncQueues.get(student.id) === queued) studentSyncQueues.delete(student.id)
  }).catch(() => undefined)
  return queued
}

export async function loginTeacherCloud(pin: string): Promise<Student[]> {
  const response = await request<{ session: CloudSession }>('/teacher/login', {
    method: 'POST',
    body: JSON.stringify({ pin }),
  })
  sessionStorage.setItem(TEACHER_SESSION_KEY, JSON.stringify(response.session))
  return fetchTeacherStudentsCloud(response.session)
}

export async function fetchTeacherStudentsCloud(session = readSession(sessionStorage, TEACHER_SESSION_KEY)): Promise<Student[]> {
  if (!session) throw new Error('Teacher session expired.')
  const response = await request<TeacherStudentsResponse>('/teacher/students', {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${session.token}` },
  })
  return response.students
}

export async function resetStudentResultsCloud(studentId: string): Promise<Student> {
  const session = readSession(sessionStorage, TEACHER_SESSION_KEY)
  if (!session) throw new CloudRequestError('Teacher session expired.', 401)
  const response = await request<{ ok: true; student: Student }>('/teacher/student/reset', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.token}` },
    body: JSON.stringify({ studentId }),
  })
  return response.student
}

export async function deleteStudentAccountCloud(studentId: string): Promise<void> {
  const session = readSession(sessionStorage, TEACHER_SESSION_KEY)
  if (!session) throw new CloudRequestError('Teacher session expired.', 401)
  await request<{ ok: true }>('/teacher/student/delete', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.token}` },
    body: JSON.stringify({ studentId }),
  })
}

export function clearTeacherCloudSession(): void {
  sessionStorage.removeItem(TEACHER_SESSION_KEY)
}
