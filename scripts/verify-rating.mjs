import assert from 'node:assert/strict'
import { stageCompetitionScore } from '../src/lib/rating.ts'

const attempt = (accuracy, success, attemptNumber) => ({
  id: String(attemptNumber),
  letter: 's',
  stage: 'uppercase',
  accuracy,
  success,
  attemptNumber,
  createdAt: '2026-09-14T00:00:00.000Z',
})

const directSuccess = {
  completed: true,
  bestAccuracy: 90,
  attempts: [attempt(90, true, 1), attempt(90, true, 2), attempt(90, true, 3)],
}

const successAfterExtraAttempts = {
  completed: true,
  bestAccuracy: 90,
  attempts: [
    attempt(40, false, 1),
    attempt(90, true, 2),
    attempt(55, false, 3),
    attempt(90, true, 4),
    attempt(90, true, 5),
  ],
}

assert.equal(stageCompetitionScore(directSuccess), 90)
assert.equal(stageCompetitionScore(successAfterExtraAttempts), 90)
assert.equal(stageCompetitionScore({ ...directSuccess, attempts: [attempt(96, true, 1), attempt(96, true, 2), attempt(96, true, 3)] }), 96)

console.log('Rating verified: extra attempts do not change the score')
