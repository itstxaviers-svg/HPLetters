import assert from 'node:assert/strict'
import { classroomPolicyForGroup, studentLessonIsOpenForGroup } from '../src/data/classroomPolicy.ts'

const cases = [
  ['11-12', { releaseCount: 25, sequential: true }],
  ['Learn Letters 11-12', { releaseCount: 25, sequential: true }],
  ['14', { releaseCount: 16, sequential: true }],
  ['learnletters14', { releaseCount: 16, sequential: true }],
  ['15', { releaseCount: 0, sequential: false }],
  ['Группа 15', { releaseCount: 0, sequential: false }],
  ['16', { releaseCount: 5, sequential: false }],
  ['Learn Letters 16', { releaseCount: 5, sequential: false }],
  ['1901979', { releaseCount: 0, sequential: false }],
  ['unknown', { releaseCount: 0, sequential: false }],
]

for (const [group, expected] of cases) {
  assert.deepEqual(classroomPolicyForGroup(group), expected, `Unexpected policy for ${group}`)
}

const accessCases = [
  ['11-12', 0, false, true],
  ['11-12', 1, false, false],
  ['11-12', 1, true, true],
  ['11-12', 24, true, true],
  ['14', 15, true, true],
  ['14', 16, true, false],
  ['15', 0, true, false],
  ['16', 4, false, true],
  ['16', 5, true, false],
  ['unknown', 0, true, false],
]

for (const [group, lessonIndex, previousComplete, expected] of accessCases) {
  assert.equal(
    studentLessonIsOpenForGroup(group, lessonIndex, previousComplete),
    expected,
    `Unexpected lesson access for ${group}, lesson ${lessonIndex}`,
  )
}

console.log(`Classroom policies verified: ${cases.length} policy and ${accessCases.length} access cases`)
