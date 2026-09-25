import type { Point } from '../types'

export function lineLength(points: Point[]): number {
  return points.slice(1).reduce(
    (sum, point, index) => sum + Math.hypot(point.x - points[index].x, point.y - points[index].y),
    0,
  )
}

/**
 * Pointer events arrive at very different rates on mice, touchscreens and
 * interactive projectors. Fill the gaps before grading so a quick, straight
 * stroke is assessed by its geometry rather than by the device event rate.
 */
export function resampleStroke(points: Point[], maxGap: number): Point[] {
  if (points.length < 2 || maxGap <= 0) return [...points]
  const result: Point[] = [points[0]]
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1]
    const end = points[index]
    const distance = Math.hypot(end.x - start.x, end.y - start.y)
    const steps = Math.max(1, Math.ceil(distance / maxGap))
    for (let step = 1; step <= steps; step += 1) {
      const ratio = step / steps
      result.push({
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio,
      })
    }
  }
  return result
}
