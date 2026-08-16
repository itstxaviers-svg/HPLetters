import type { Attempt, LessonProgress, StageProgress, Student } from '../types'
import { alphabetOrder, lessons } from '../data/lessons'

export function successfulAttempts(stage: StageProgress): Attempt[] {
  return stage.attempts.filter((attempt) => attempt.success).slice(0, 3)
}

export function stageCompetitionScore(stage: StageProgress): number {
  const successful = successfulAttempts(stage)
  if (!successful.length) return 0

  const average = successful.reduce((sum, attempt) => sum + attempt.accuracy, 0) / successful.length
  const completionRatio = successful.length / 3
  const attemptsToQualify = successful.at(-1)?.attemptNumber ?? stage.attempts.length
  const firstTryBonus = successful.length === 3 && attemptsToQualify === 3 ? 3 : 0
  const extraAttemptPenalty = Math.max(0, attemptsToQualify - 3) * 1.5

  return Math.max(0, (average + firstTryBonus - extraAttemptPenalty) * completionRatio)
}

export function lessonCompetitionScore(progress: LessonProgress): number {
  return (stageCompetitionScore(progress.uppercase) + stageCompetitionScore(progress.lowercase)) / 2
}

export function completedLetters(student: Student): number {
  return Object.values(student.progress).filter((progress) => progress?.completed).length
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

export function competitionScore(student: Student): number {
  const progress = Object.values(student.progress).filter(Boolean) as LessonProgress[]
  if (!progress.length) return 0
  const stageTotal = progress.reduce((sum, lesson) => sum + lessonCompetitionScore(lesson), 0)
  const completionWeight = completedLetters(student) * 8
  return stageTotal + completionWeight
}

export function cleanCompletedLetters(student: Student): number {
  return Object.values(student.progress).filter((progress) => progress?.completed
    && progress.uppercase.attempts.length === 3
    && progress.lowercase.attempts.length === 3).length
}

export function rankStudents(students: Student[]): Student[] {
  return [...students].sort((a, b) => {
    const scoreDiff = competitionScore(b) - competitionScore(a)
    if (Math.abs(scoreDiff) > 0.001) return scoreDiff
    const accuracyDiff = averageAccuracy(b) - averageAccuracy(a)
    if (Math.abs(accuracyDiff) > 0.001) return accuracyDiff
    const cleanDiff = cleanCompletedLetters(b) - cleanCompletedLetters(a)
    if (cleanDiff !== 0) return cleanDiff
    return a.createdAt.localeCompare(b.createdAt)
  })
}

export function isTrueTie(a?: Student, b?: Student): boolean {
  if (!a || !b) return false
  return Math.abs(competitionScore(a) - competitionScore(b)) < 0.001
    && Math.abs(averageAccuracy(a) - averageAccuracy(b)) < 0.001
    && cleanCompletedLetters(a) === cleanCompletedLetters(b)
}

export function completionPercent(student: Student): number {
  return Math.round((completedLetters(student) / alphabetOrder.length) * 100)
}

export function availableLessonProgress(student: Student): number {
  return Math.round((completedLetters(student) / lessons.length) * 100)
}
