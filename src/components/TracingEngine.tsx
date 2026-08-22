import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { motion } from 'motion/react'
import { Hand, Sparkles } from 'lucide-react'
import type { Point, StageKind, TraceLessonConfig, TraceSegment } from '../types'

interface TracingEngineProps {
  lesson: TraceLessonConfig
  stage: StageKind
  disabled?: boolean
  soundEnabled?: boolean
  onResult: (accuracy: number, success: boolean) => void
}

interface SegmentResult {
  accuracy: number
  valid: boolean
  majorDeviation: boolean
}

function lineLength(points: Point[]) {
  return points.slice(1).reduce((sum, point, index) => sum + Math.hypot(point.x - points[index].x, point.y - points[index].y), 0)
}

function minDistance(point: Point, targets: Point[]) {
  let closest = Number.POSITIVE_INFINITY
  for (const target of targets) closest = Math.min(closest, Math.hypot(point.x - target.x, point.y - target.y))
  return closest
}

export function TracingEngine({ lesson, stage, disabled = false, soundEnabled = true, onResult }: TracingEngineProps) {
  const config = lesson[stage]
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const strokesRef = useRef<Point[][]>([])
  const activeStrokeRef = useRef<Point[] | null>(null)
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 })
  const [strokeCount, setStrokeCount] = useState(0)
  const [locked, setLocked] = useState(false)

  const stopAudio = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    const { width, height, dpr } = sizeRef.current
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    context.clearRect(0, 0, width, height)
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.strokeStyle = '#2f5fb4'
    context.lineWidth = Math.max(6, Math.min(width, height) * 0.018)
    context.shadowColor = 'rgba(139, 184, 255, .7)'
    context.shadowBlur = 10

    const allStrokes = [...strokesRef.current, ...(activeStrokeRef.current ? [activeStrokeRef.current] : [])]
    for (const points of allStrokes) {
      if (!points.length) continue
      context.beginPath()
      context.moveTo(points[0].x, points[0].y)
      if (points.length === 1) {
        context.lineTo(points[0].x + 0.1, points[0].y + 0.1)
      } else {
        for (let index = 1; index < points.length - 1; index += 1) {
          const midpoint = { x: (points[index].x + points[index + 1].x) / 2, y: (points[index].y + points[index + 1].y) / 2 }
          context.quadraticCurveTo(points[index].x, points[index].y, midpoint.x, midpoint.y)
        }
        const finalPoint = points.at(-1)!
        context.lineTo(finalPoint.x, finalPoint.y)
      }
      context.stroke()
    }
  }, [])

  const clear = useCallback(() => {
    strokesRef.current = []
    activeStrokeRef.current = null
    setStrokeCount(0)
    stopAudio()
    draw()
  }, [draw, stopAudio])

  useEffect(() => {
    const audio = audioRef.current
    if (!soundEnabled) stopAudio()
    return () => audio?.pause()
  }, [soundEnabled, stopAudio])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width
      const height = entry.contentRect.height
      const dpr = Math.max(1, window.devicePixelRatio || 1)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      sizeRef.current = { width, height, dpr }
      draw()
    })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [draw])

  const localPoint = (event: ReactPointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const viewBoxTransform = () => {
    const { width, height } = sizeRef.current
    const scale = Math.min(width / 100, height / 100)
    return { scale, offsetX: (width - 100 * scale) / 2, offsetY: (height - 100 * scale) / 2 }
  }

  const segmentPoints = (segment: TraceSegment): Point[] => {
    const path = svgRef.current?.querySelector<SVGPathElement>(`[data-segment="${segment.id}"]`)
    if (!path) return []
    const length = path.getTotalLength()
    const { scale, offsetX, offsetY } = viewBoxTransform()
    return Array.from({ length: 121 }, (_, index) => {
      const point = path.getPointAtLength((index / 120) * length)
      return { x: offsetX + point.x * scale, y: offsetY + point.y * scale }
    })
  }

  const gradeSegment = (segment: TraceSegment, points: Point[]): SegmentResult => {
    const { scale, offsetX, offsetY } = viewBoxTransform()
    if (segment.tap) {
      const target = { x: offsetX + segment.tap.x * scale, y: offsetY + segment.tap.y * scale }
      const distance = minDistance(target, points)
      const radius = segment.tap.radius * scale
      const tapLike = lineLength(points) <= Math.max(18, radius * 1.8)
      const accuracy = Math.max(0, 100 - (distance / (radius * 1.7)) * 100)
      return { accuracy, valid: tapLike && distance <= radius * 1.7, majorDeviation: distance > radius * 1.25 }
    }

    const template = segmentPoints(segment)
    const stride = Math.max(1, Math.floor(points.length / 140))
    const sampledInput = points.filter((_, index) => index % stride === 0)
    if (!template.length || sampledInput.length < config.tolerances.minPoints) return { accuracy: 0, valid: false, majorDeviation: true }
    const corridor = config.tolerances.corridor * scale
    const distances = sampledInput.map((point) => minDistance(point, template))
    const averageDistance = distances.reduce((sum, distance) => sum + distance, 0) / sampledInput.length
    const outsideShare = distances.filter((distance) => distance > corridor).length / distances.length
    const majorDeviation = outsideShare > 0.08 || distances.some((distance) => distance > corridor * 1.65)
    const covered = template.filter((point) => minDistance(point, sampledInput) <= corridor).length / template.length
    const precision = Math.max(0, 1 - averageDistance / corridor)
    const accuracy = Math.max(0, Math.min(100, (precision * 0.58 + covered * 0.42) * 100))
    const valid = lineLength(points) >= config.tolerances.minLength * scale
      && covered >= config.tolerances.segmentCoverage
    return { accuracy, valid, majorDeviation }
  }

  const assess = (strokes: Point[][]) => {
    const results = config.segments.map((segment, index) => gradeSegment(segment, strokes[index] ?? []))
    const measuredAccuracy = Math.round(results.reduce((sum, result) => sum + result.accuracy, 0) / results.length)
    const accuracy = results.some((result) => result.majorDeviation) ? Math.min(90, measuredAccuracy) : measuredAccuracy
    const success = results.every((result) => result.valid) && accuracy >= lesson.targetAccuracy
    stopAudio()
    setLocked(true)
    window.setTimeout(() => {
      onResult(accuracy, success)
      clear()
      setLocked(false)
    }, 460)
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (disabled || locked || strokesRef.current.length >= config.segments.length) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const point = localPoint(event)
    activeStrokeRef.current = [point]
    if (soundEnabled && audioRef.current?.paused) {
      audioRef.current.currentTime = 0
      void audioRef.current.play().catch(() => undefined)
    }
    draw()
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = localPoint(event)
    const active = activeStrokeRef.current
    if (!active) return
    const last = active.at(-1)!
    if (Math.hypot(point.x - last.x, point.y - last.y) >= 1.4) active.push(point)
    draw()
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const active = activeStrokeRef.current
    if (!active) return
    active.push(localPoint(event))
    strokesRef.current = [...strokesRef.current, active]
    activeStrokeRef.current = null
    const count = strokesRef.current.length
    setStrokeCount(count)
    draw()
    if (count === config.segments.length) assess(strokesRef.current)
  }

  return (
    <div className="tracing-engine">
      <div className="trace-instruction"><Hand size={18} /><span>{config.hint}</span></div>
      <div className={`trace-board ${disabled ? 'trace-board--disabled' : ''}`}>
        <svg ref={svgRef} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <line className="guide-line" x1="10" y1="14" x2="90" y2="14" />
          <line className="guide-line guide-line--middle" x1="10" y1="50" x2="90" y2="50" />
          <line className="guide-line" x1="10" y1="89" x2="90" y2="89" />
          {config.segments.map((segment) => (
            <g key={segment.id}>
              <path className="trace-path-under" d={segment.underPath ?? segment.path} />
              <path data-segment={segment.id} className="trace-path" d={segment.path} />
            </g>
          ))}
        </svg>
        <canvas
          ref={canvasRef}
          aria-label={`Trace ${config.label}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        {locked && <motion.div className="grading-badge" initial={{ scale: 0.7 }} animate={{ scale: 1 }}><Sparkles /> Checking your magic… (Проверяем волшебство…)</motion.div>}
      </div>
      <div className="stroke-dots" aria-label={`${strokeCount} of ${config.segments.length} strokes`}>
        {config.segments.map((segment, index) => <span key={segment.id} className={index < strokeCount ? 'is-done' : ''}>{index + 1}</span>)}
        <small>{config.segments.length === 1 ? 'one smooth stroke (одно плавное движение)' : `${config.segments.length} strokes in order (штриха по порядку)`}</small>
      </div>
      {lesson.soundUrl && <audio ref={audioRef} src={lesson.soundUrl} preload="auto" loop />}
    </div>
  )
}
