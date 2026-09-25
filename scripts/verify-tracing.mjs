import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { alphabetOrder, lessons } from '../src/data/lessons.ts'
import { lineLength, resampleStroke } from '../src/lib/traceGeometry.ts'

assert.equal(lessons.length, alphabetOrder.length, 'Every released letter must have a tracing lesson')
assert.deepEqual(lessons.map((lesson) => lesson.key), [...alphabetOrder], 'Lesson order must match the menu')

for (const [order, lesson] of lessons.entries()) {
  assert.equal(lesson.order, order, `Wrong order for ${lesson.key}`)
  assert.ok(existsSync(new URL(`../public/audio/${lesson.key}.mp3`, import.meta.url)), `Missing audio for ${lesson.key}`)
  assert.ok(lesson.requiredSuccesses > 0 && lesson.requiredSuccesses <= lesson.maxAttempts, `Invalid attempt rules for ${lesson.key}`)
  for (const stageName of ['uppercase', 'lowercase']) {
    const stage = lesson[stageName]
    assert.ok(stage.segments.length > 0, `${lesson.key} ${stageName} has no segments`)
    assert.equal(new Set(stage.segments.map((segment) => segment.id)).size, stage.segments.length, `${lesson.key} ${stageName} has duplicate segment IDs`)
    assert.ok(stage.tolerances.corridor > 0, `${lesson.key} ${stageName} has no drawing corridor`)
    assert.ok(stage.tolerances.segmentCoverage > 0 && stage.tolerances.segmentCoverage <= 1, `${lesson.key} ${stageName} has invalid coverage`)
    for (const segment of stage.segments) {
      assert.match(segment.path, /^M/i, `${lesson.key} ${stageName}/${segment.id} has an invalid SVG path`)
      if (segment.tap) assert.ok(segment.tap.radius > 0, `${lesson.key} ${stageName}/${segment.id} has an invalid tap target`)
    }
  }
}

// A fast line may arrive as only two pointer events. It still needs enough
// geometric samples for the common 7/8-point tracing thresholds.
const fastLine = [{ x: 10, y: 10 }, { x: 10, y: 170 }]
const resampledFastLine = resampleStroke(fastLine, 3)
assert.ok(resampledFastLine.length > 50, 'Fast strokes must be resampled independently of pointer frequency')
assert.equal(Math.round(lineLength(resampledFastLine)), 160, 'Resampling must preserve stroke length')

const nCapital = lessons.find((lesson) => lesson.key === 'n')?.uppercase
assert.ok(nCapital?.segments[0].strictStart && nCapital.segments[0].strictStart.y >= 80, 'Capital N must start from the bottom')
assert.equal(lessons.find((lesson) => lesson.key === 'h')?.uppercase.segments.length, 3, 'Capital H must contain all three strokes')
assert.equal(lessons.find((lesson) => lesson.key === 'h')?.lowercase.segments.length, 1, 'Lowercase h must remain a smooth single stroke')
assert.equal(lessons.find((lesson) => lesson.key === 'i')?.uppercase.segments.length, 3, 'Capital I must contain the stem and both bars')
assert.ok(lessons.find((lesson) => lesson.key === 'i')?.lowercase.segments.some((segment) => segment.tap), 'Lowercase i must include a dot target')

console.log(`Tracing verified: ${lessons.length} letters, ${lessons.reduce((sum, lesson) => sum + lesson.uppercase.segments.length + lesson.lowercase.segments.length, 0)} stage segments`)
