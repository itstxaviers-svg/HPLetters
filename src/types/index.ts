export type LetterKey =
  | 's' | 'i' | 't' | 'p' | 'a' | 'n' | 'm' | 'd' | 'g' | 'o'
  | 'c' | 'k' | 'e' | 'u' | 'r' | 'h' | 'b' | 'f' | 'l' | 'j'
  | 'v' | 'w' | 'x' | 'y' | 'z'
export type StageKind = 'uppercase' | 'lowercase'

export interface Point {
  x: number
  y: number
}

export interface TraceSegment {
  id: string
  path: string
  underPath?: string
  tap?: { x: number; y: number; radius: number }
  strictStart?: { x: number; y: number; radius: number }
}

export interface TraceTolerances {
  corridor: number
  segmentCoverage: number
  minLength: number
  minPoints: number
}

export interface TraceStageConfig {
  label: string
  segments: TraceSegment[]
  strokeRule: 'single' | 'stem-first' | 'stem-then-tap' | 'strict-two'
  tolerances: TraceTolerances
  hint: string
}

export interface TraceLessonConfig {
  key: LetterKey
  order: number
  soundUrl: string
  word: string
  requiredSuccesses: number
  maxAttempts: number
  targetAccuracy: number
  uppercase: TraceStageConfig
  lowercase: TraceStageConfig
}

export interface Attempt {
  id: string
  letter: LetterKey
  stage: StageKind
  accuracy: number
  success: boolean
  attemptNumber: number
  createdAt: string
}

export interface StageProgress {
  completed: boolean
  attempts: Attempt[]
  bestAccuracy: number
  roundStartIndex?: number
}

export interface LessonProgress {
  letter: LetterKey
  completed: boolean
  completedAt?: string
  uppercase: StageProgress
  lowercase: StageProgress
}

export interface BadgeAward {
  badgeId: string
  awardedAt: string
}

export interface Student {
  id: string
  name: string
  group: string
  createdAt: string
  progress: Partial<Record<LetterKey, LessonProgress>>
  badges: BadgeAward[]
}

export interface AppSettings {
  sound: boolean
  reducedEffects: boolean
}

export interface AppData {
  students: Student[]
  currentStudentId: string | null
  settings: AppSettings
}
