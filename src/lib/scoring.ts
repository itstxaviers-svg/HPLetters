import type { Attempt, LessonProgress, Student } from '../types'
import { alphabetOrder, lessons, studentReleaseCountForGroup } from '../data/lessons'
import { stageCompetitionScore } from './rating'

export { currentRoundAttempts, stageCompetitionScore, successfulAttempts } from './rating'

export function lessonCompetitionScore(progress: LessonProgress): number {
  return (stageCompetitionScore(progress.uppercase) + stageCompetitionScore(progress.lowercase)) / 2
}

export function completedLetters(student: Student): number {
  return Object.values(student.progress).filter((progress) => progress?.completed).length
}

export function completedAssignedLetters(student: Student): number {
  const assigned = alphabetOrder.slice(0, studentReleaseCountForGroup(student.group))
  return assigned.filter((letter) => student.progress[letter]?.completed).length
}

export function allAttempts(student: Student): Attempt[] {
  return Object.values(student.progress).flatMap((progress) => progress
    ? [...progress.uppercase.attempts, ...progress.lowercase.attempts]
    : [])
}

export function averageAccuracy(student: Student): number {
  const attempts = allAttempts(student).filter((attempt) => attempt.success)
  if (!attempts.length) return 0
  return attempts.reduce((sum, attempt) => sum + attempt.accuracy, 0) / attempts.length
}

export function classAverageAccuracy(students: Student[]): number {
  const attempts = students.flatMap(allAttempts).filter((attempt) => attempt.success)
  if (!attempts.length) return 0
  return attempts.reduce((sum, attempt) => sum + attempt.accuracy, 0) / attempts.length
}

export function latestActivityAt(student: Student): string | undefined {
  const dates = allAttempts(student).map((attempt) => attempt.createdAt).filter(Boolean)
  if (student.updatedAt) dates.push(student.updatedAt)
  return dates.sort().at(-1)
}

export function competitionScore(student: Student): number {
  const progress = Object.values(student.progress).filter(Boolean) as LessonProgress[]
  if (!progress.length) return 0
  const stageTotal = progress.reduce((sum, lesson) => sum + lessonCompetitionScore(lesson), 0)
  const completionWeight = completedLetters(student) * 8
  return stageTotal + completionWeight
}

export function rankStudents(students: Student[]): Student[] {
  return [...students].sort((a, b) => {
    const scoreDiff = competitionScore(b) - competitionScore(a)
    if (Math.abs(scoreDiff) > 0.001) return scoreDiff
    return a.name.localeCompare(b.name)
  })
}

export function isTrueTie(a?: Student, b?: Student): boolean {
  if (!a || !b) return false
  return Math.abs(competitionScore(a) - competitionScore(b)) < 0.001
}

export function completionPercent(student: Student): number {
  const assigned = studentReleaseCountForGroup(student.group)
  return assigned ? Math.round((completedAssignedLetters(student) / assigned) * 100) : 0
}

export function availableLessonProgress(student: Student): number {
  const assigned = Math.min(lessons.length, studentReleaseCountForGroup(student.group))
  return assigned ? Math.round((completedAssignedLetters(student) / assigned) * 100) : 0
}
