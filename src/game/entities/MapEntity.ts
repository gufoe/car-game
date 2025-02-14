import type { Position } from '../types'
import type { Car } from '../Car'
import { type Shape, isRect, isCircle } from '../shapes/Shape'

export interface MapEntityEffect {
  type: string
  value: number
  duration: number
  startTime?: number
}

export abstract class MapEntity {
  protected shape: Shape
  protected isActive: boolean = true

  constructor(shape: Shape) {
    this.shape = shape
  }

  protected abstract draw(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void

  public abstract onHit(car: Car): void

  public update(deltaTime: number): void {
    // Default implementation does nothing
    // Subclasses can override if they need update behavior
  }

  public handleCollision(car: Car): void {
    if (this.isActive) {
      this.onHit(car)
    }
  }

  public isActiveEntity(): boolean {
    return this.isActive
  }

  public getShape(): Shape {
    return this.shape
  }

  protected deactivate(): void {
    this.isActive = false
  }

  protected getDimensions(): { width: number, height: number } {
    if (isRect(this.shape)) {
      return { width: this.shape.width, height: this.shape.height }
    } else if (isCircle(this.shape)) {
      return { width: this.shape.radius * 2, height: this.shape.radius * 2 }
    }
    throw new Error('Unknown shape type')
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.isActive) return

    const pos = this.shape.getPosition()
    const { width, height } = this.getDimensions()
    this.draw(ctx, pos.x, pos.y, width, height)
  }
}
