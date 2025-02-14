import type { Position } from './types'

interface TracePoint {
  x: number
  y: number
  intensity: number
}

export class WheelTraces {
  private traces: Map<string, TracePoint[]> = new Map()
  private readonly maxPoints = 1000  // Maximum points per wheel trace
  private readonly fadeRate = 0.995  // How quickly traces fade
  private readonly minIntensity = 0.1  // When to remove trace points

  constructor() {
    // Initialize traces for each wheel
    ['frontLeft', 'frontRight', 'rearLeft', 'rearRight'].forEach(wheel => {
      this.traces.set(wheel, [])
    })
  }

  public addTracePoint(wheel: string, position: Position, intensity: number = 1): void {
    const trace = this.traces.get(wheel) || []
    trace.push({ ...position, intensity })

    // Remove oldest points if exceeding max length
    if (trace.length > this.maxPoints) {
      trace.shift()
    }

    this.traces.set(wheel, trace)
  }

  public update(): void {
    // Fade out all traces
    for (const [wheel, trace] of this.traces.entries()) {
      // Update intensities and filter out faded points
      const updatedTrace = trace
        .map(point => ({ ...point, intensity: point.intensity * this.fadeRate }))
        .filter(point => point.intensity > this.minIntensity)

      this.traces.set(wheel, updatedTrace)
    }
  }

  public draw(ctx: CanvasRenderingContext2D, carPosition: Position): void {
    ctx.save()

    for (const [wheelName, trace] of this.traces.entries()) {
      if (trace.length < 2) continue

      // Determine color based on wheel position
      const isRearWheel = wheelName.startsWith('rear')
      const baseColor = isRearWheel ? 'rgba(0, 0, 255,' : 'rgba(0, 255, 0,'

      // Draw each segment with its own opacity based on recorded intensity
      for (let i = 1; i < trace.length; i++) {
        const prevPoint = trace[i - 1]
        const currentPoint = trace[i]

        ctx.beginPath()
        ctx.moveTo(prevPoint.x, prevPoint.y)
        ctx.lineTo(currentPoint.x, currentPoint.y)

        // Use average intensity of the two points for smooth transitions
        const segmentIntensity = (prevPoint.intensity + currentPoint.intensity) / 2
        ctx.strokeStyle = `${baseColor}${segmentIntensity * 0.5})`
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }

    ctx.restore()
  }

  public clear(): void {
    const wheelNames = ['frontLeft', 'frontRight', 'rearLeft', 'rearRight'] as const;
    this.traces = new Map();
    wheelNames.forEach((wheel) => {
      this.traces.set(wheel, []);
    });
  }
}
