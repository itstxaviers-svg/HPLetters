import type { LessonProgress, Student } from '../types'
import { allAttempts, averageAccuracy, completedLetters } from './scoring'
import { lessons } from '../data/lessons'

export function earnedBadgeIds(student: Student): string[] {
  const earned = new Set(student.badges.map((award) => award.badgeId))
  const attempts = allAttempts(student)
  const progresses = Object.values(student.progress).filter(Boolean) as LessonProgress[]
  const completed = completedLetters(student)

  if (attempts.length >= 3 && averageAccuracy(student) >= 92) earned.add('golden-quill')
  if (progresses.some((progress) => progress.uppercase.completed && progress.lowercase.completed
    && progress.uppercase.attempts.length === 3 && progress.lowercase.attempts.length === 3)) earned.add('first-try')
  if (progresses.some((progress) => [...progress.uppercase.attempts, ...progress.lowercase.attempts]
    .some((attempt) => attempt.success && attempt.accuracy >= 95))) earned.add('perfect-letter')
  if (progresses.some((progress) => [...progress.uppercase.attempts, ...progress.lowercase.attempts]
    .some((attempt, index, list) => attempt.success && list.slice(0, index).some((earlier) => !earlier.success)))) earned.add('persistence')
  if (progresses.some((progress) => {
    const scores = [...progress.uppercase.attempts, ...progress.lowercase.attempts].map((attempt) => attempt.accuracy)
    return scores.some((score, index) => index > 0 && score - Math.min(...scores.slice(0, index)) >= 15)
  })) earned.add('progress-spark')
  if (lessons.every((lesson) => student.progress[lesson.key]?.uppercase.completed)) earned.add('uppercase-master')
  if (lessons.every((lesson) => student.progress[lesson.key]?.lowercase.completed)) earned.add('lowercase-master')
  if (completed >= 5) earned.add('letters-5')
  if (completed >= 10) earned.add('letters-10')
  if (completed >= 25) earned.add('alphabet-master')

  return [...earned]
}
