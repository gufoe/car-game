import type { Position } from './types'

interface SmokePoint {
  x: number
  y: number
  intensity: number
}

export class VisualEffects {
  private smokePoints: SmokePoint[] = []
  private readonly maxPoints = 1000
  private readonly fadeRate = 0.98
  private readonly minIntensity = 0.1

  public update(speed: number, position: Position, rotation: number): void {
    // Add new smoke points if moving
    if (speed > 2) {
      // Calculate exhaust positions (two exhaust pipes)
      const exhaustOffsets = [
        { x: -10, y: 35 },  // Left exhaust
        { x: 10, y: 35 }    // Right exhaust
      ]

      exhaustOffsets.forEach(offset => {
        // Transform exhaust position to world space
        const exhaustX = position.x + (offset.x * Math.cos(rotation) - offset.y * Math.sin(rotation))
        const exhaustY = position.y + (offset.x * Math.sin(rotation) + offset.y * Math.cos(rotation))

        // Add smoke point
        this.smokePoints.push({
          x: exhaustX,
          y: exhaustY,
          intensity: 1.0
        })

        // Remove oldest points if exceeding max length
        if (this.smokePoints.length > this.maxPoints) {
          this.smokePoints.shift()
        }
      })
    }

    // Update intensities and filter out faded points
    this.smokePoints = this.smokePoints
      .map(point => ({ ...point, intensity: point.intensity * this.fadeRate }))
      .filter(point => point.intensity > this.minIntensity)
  }

  public draw(ctx: CanvasRenderingContext2D, carPosition: Position): void {
    ctx.save()

    const screenX = ctx.canvas.width / 2
    const screenY = ctx.canvas.height * 0.8

    // Draw smoke points
    this.smokePoints.forEach(point => {
      ctx.beginPath()
      ctx.fillStyle = `rgba(200, 200, 200, ${point.intensity * 0.3})`
      ctx.arc(
        screenX + (point.x - carPosition.x),
        screenY + (point.y - carPosition.y),
        3 * point.intensity,
        0,
        Math.PI * 2
      )
      ctx.fill()
    })

    ctx.restore()
  }
}
