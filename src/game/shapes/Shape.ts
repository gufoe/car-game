import type { Position } from '../types'

export interface IShape {
  collidesWith(other: IShape): boolean
  collidesWithRect(rect: RectShape): boolean
  collidesWithCircle(circle: CircleShape): boolean
  getPosition(): { x: number, y: number }
  setPosition(x: number, y: number): void
  debugDraw(ctx: CanvasRenderingContext2D): void
}

export interface IRectShape extends IShape {
  readonly width: number
  readonly height: number
  readonly rotation: number
  getCorners(): { x: number, y: number }[]
}

export interface ICircleShape extends IShape {
  readonly radius: number
}

export abstract class Shape implements IShape {
  public x: number
  public y: number

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }

  abstract collidesWith(other: Shape): boolean
  abstract collidesWithRect(rect: RectShape): boolean
  abstract collidesWithCircle(circle: CircleShape): boolean
  abstract debugDraw(ctx: CanvasRenderingContext2D): void

  getPosition(): { x: number, y: number } {
    return { x: this.x, y: this.y }
  }

  setPosition(x: number, y: number): void {
    this.x = x
    this.y = y
  }
}

export class RectShape extends Shape implements IRectShape {
  private corners: { x: number, y: number }[] = []

  constructor(
    x: number,
    y: number,
    public readonly width: number,
    public readonly height: number,
    public readonly rotation: number = 0,
    corners?: { x: number, y: number }[]
  ) {
    super(x, y)
    if (corners) {
      this.corners = corners
    } else {
      // Calculate corners for a non-rotated rectangle
      const halfWidth = width / 2
      const halfHeight = height / 2
      this.corners = [
        { x: x - halfWidth, y: y - halfHeight },
        { x: x + halfWidth, y: y - halfHeight },
        { x: x + halfWidth, y: y + halfHeight },
        { x: x - halfWidth, y: y + halfHeight }
      ]
    }
  }

  getCorners(): { x: number, y: number }[] {
    return this.corners
  }

  collidesWith(other: Shape): boolean {
    if (other instanceof RectShape) {
      return this.collidesWithRect(other)
    } else if (other instanceof CircleShape) {
      return this.collidesWithCircle(other)
    }
    return false
  }

  collidesWithRect(rect: RectShape): boolean {
    // Separating Axis Theorem (SAT) for oriented rectangle collision
    const axes = this.getAxes().concat(rect.getAxes())

    for (const axis of axes) {
      const p1 = this.project(axis)
      const p2 = rect.project(axis)

      if (!this.overlap(p1, p2)) {
        return false
      }
    }

    return true
  }

  private getAxes(): { x: number, y: number }[] {
    const axes: { x: number, y: number }[] = []
    const corners = this.getCorners()

    // Get all four axes from this rectangle
    for (let i = 0; i < corners.length; i++) {
      const p1 = corners[i]
      const p2 = corners[(i + 1) % corners.length]
      const edge = { x: p2.x - p1.x, y: p2.y - p1.y }
      const length = Math.sqrt(edge.x * edge.x + edge.y * edge.y)

      // Normalize the perpendicular vector
      const axis = { x: -edge.y / length, y: edge.x / length }

      // Check if this axis is already included (avoid duplicates)
      const isDuplicate = axes.some(existing =>
        (Math.abs(existing.x - axis.x) < 0.0001 && Math.abs(existing.y - axis.y) < 0.0001) ||
        (Math.abs(existing.x + axis.x) < 0.0001 && Math.abs(existing.y + axis.y) < 0.0001)
      )

      if (!isDuplicate) {
        axes.push(axis)
      }
    }

    return axes
  }

  private project(axis: { x: number, y: number }): { min: number, max: number } {
    let min = Number.POSITIVE_INFINITY
    let max = Number.NEGATIVE_INFINITY

    const corners = this.getCorners()
    for (const corner of corners) {
      const proj = corner.x * axis.x + corner.y * axis.y
      min = Math.min(min, proj)
      max = Math.max(max, proj)
    }

    return { min, max }
  }

  private overlap(p1: { min: number, max: number }, p2: { min: number, max: number }): boolean {
    return !(p1.max < p2.min || p2.max < p1.min)
  }

  collidesWithCircle(circle: CircleShape): boolean {
    // Find the closest point on the oriented rectangle to the circle's center
    const corners = this.getCorners()
    let closestDist = Number.POSITIVE_INFINITY
    let closestPoint = { x: 0, y: 0 }

    // Check each edge of the rectangle
    for (let i = 0; i < corners.length; i++) {
      const p1 = corners[i]
      const p2 = corners[(i + 1) % corners.length]
      const closest = this.closestPointOnLine(p1, p2, { x: circle.x, y: circle.y })
      const dist = (closest.x - circle.x) ** 2 + (closest.y - circle.y) ** 2

      if (dist < closestDist) {
        closestDist = dist
        closestPoint = closest
      }
    }

    // Check if the closest point is within the circle's radius
    return closestDist <= circle.radius * circle.radius
  }

  private closestPointOnLine(
    p1: { x: number, y: number },
    p2: { x: number, y: number },
    point: { x: number, y: number }
  ): { x: number, y: number } {
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    const length2 = dx * dx + dy * dy

    if (length2 === 0) return p1

    const t = Math.max(0, Math.min(1, ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / length2))

    return {
      x: p1.x + t * dx,
      y: p1.y + t * dy
    }
  }

  debugDraw(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = '#ff0000'
    ctx.lineWidth = 2

    // Draw the oriented rectangle
    ctx.beginPath()
    const corners = this.getCorners()
    ctx.moveTo(corners[0].x, corners[0].y)
    for (let i = 1; i < corners.length; i++) {
      ctx.lineTo(corners[i].x, corners[i].y)
    }
    ctx.closePath()
    ctx.stroke()

    // Draw center point
    ctx.fillStyle = '#ff0000'
    ctx.beginPath()
    ctx.arc(this.x, this.y, 2, 0, Math.PI * 2)
    ctx.fill()
  }
}

export class CircleShape extends Shape implements ICircleShape {
  constructor(x: number, y: number, public readonly radius: number) {
    super(x, y)
  }

  collidesWith(other: Shape): boolean {
    if (other instanceof RectShape) {
      return this.collidesWithRect(other)
    } else if (other instanceof CircleShape) {
      return this.collidesWithCircle(other)
    }
    return false
  }

  collidesWithRect(rect: RectShape): boolean {
    return rect.collidesWithCircle(this)
  }

  collidesWithCircle(circle: CircleShape): boolean {
    const dx = this.x - circle.x
    const dy = this.y - circle.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance < (this.radius + circle.radius)
  }

  debugDraw(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = '#ff0000'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.stroke()

    // Draw a dot at the center
    ctx.fillStyle = '#ff0000'
    ctx.beginPath()
    ctx.arc(this.x, this.y, 2, 0, Math.PI * 2)
    ctx.fill()
  }
}
