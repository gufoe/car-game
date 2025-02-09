import type { Position } from '../types'

export interface IShape {
  collidesWith(other: IShape): boolean
  collidesWithRect(rect: RectShape): boolean
  collidesWithCircle(circle: CircleShape): boolean
  getPosition(): { x: number, y: number }
  setPosition(x: number, y: number): void
}

export interface IRectShape extends IShape {
  readonly width: number
  readonly height: number
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

  getPosition(): { x: number, y: number } {
    return { x: this.x, y: this.y }
  }

  setPosition(x: number, y: number): void {
    this.x = x
    this.y = y
  }
}

export class RectShape extends Shape implements IRectShape {
  constructor(x: number, y: number, public readonly width: number, public readonly height: number) {
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
    return this.x < rect.x + rect.width &&
           this.x + this.width > rect.x &&
           this.y < rect.y + rect.height &&
           this.y + this.height > rect.y
  }

  collidesWithCircle(circle: CircleShape): boolean {
    // Find the closest point to the circle within the rectangle
    const closestX = Math.max(this.x, Math.min(circle.x, this.x + this.width))
    const closestY = Math.max(this.y, Math.min(circle.y, this.y + this.height))

    // Calculate the distance between the circle's center and this closest point
    const distanceX = circle.x - closestX
    const distanceY = circle.y - closestY

    // If the distance is less than the circle's radius, an intersection occurs
    const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY)
    return distanceSquared < (circle.radius * circle.radius)
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
}
