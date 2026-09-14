import type { Attempt, StageProgress } from '../types'

export function currentRoundAttempts(stage: StageProgress): Attempt[] {
  return stage.attempts.slice(stage.roundStartIndex ?? 0)
}

export function successfulAttempts(stage: StageProgress): Attempt[] {
  return currentRoundAttempts(stage).filter((attempt) => attempt.success).slice(0, 3)
}

export function stageCompetitionScore(stage: StageProgress): number {
  const successful = successfulAttempts(stage)
  if (!successful.length) return 0
  const average = successful.reduce((sum, attempt) => sum + attempt.accuracy, 0) / successful.length
  return average * (successful.length / 3)
}
