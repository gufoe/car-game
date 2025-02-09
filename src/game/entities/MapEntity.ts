import type { Position } from '../types'
import type { Car } from '../Car'
import { CircleShape, RectShape, type Shape } from '../shapes/Shape'

export interface MapEntityConfig {
  shape: Shape
  draw?: (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => void
  onHit?: (car: Car) => void
  onUpdate?: (deltaTime: number) => void
  duration?: number // Duration of effect in milliseconds, if applicable
  deactivateOnHit?: boolean // Whether the entity should be deactivated when hit
}

export interface MapEntityEffect {
  type: string
  value: number
  duration: number
  startTime?: number
}

export class MapEntity {
  public readonly shape: Shape
  private draw?: (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => void
  private onHit?: (car: Car) => void
  private onUpdate?: (deltaTime: number) => void
  private duration?: number
  private deactivateOnHit: boolean
  private isActive: boolean = true
  private effect?: MapEntityEffect

  constructor(config: MapEntityConfig) {
    this.shape = config.shape
    this.draw = config.draw
    this.onHit = config.onHit
    this.onUpdate = config.onUpdate
    this.duration = config.duration
    this.deactivateOnHit = config.deactivateOnHit ?? false
  }

  public handleCollision(car: Car): void {
    if (this.isActive && this.onHit) {
      this.onHit(car)
      // Only deactivate if explicitly set to do so
      if (this.deactivateOnHit) {
        this.isActive = false
      }
    }
  }

  public update(deltaTime: number): void {
    if (this.isActive && this.onUpdate) {
      this.onUpdate(deltaTime)
    }
  }

  public render(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    if (this.isActive && this.draw) {
      // Calculate dimensions based on shape type
      let width: number, height: number
      if ('width' in this.shape && 'height' in this.shape) {
        // Rectangle shape
        const rectShape = this.shape as RectShape
        width = rectShape.width
        height = rectShape.height
      } else {
        // Circle shape
        const circleShape = this.shape as CircleShape
        width = circleShape.radius * 2
        height = circleShape.radius * 2
      }
      // Use world coordinates directly
      this.draw(ctx, x, y, width, height)
    }
  }

  public isActiveEntity(): boolean {
    return this.isActive
  }

  public getEffect(): MapEntityEffect | undefined {
    return this.effect
  }

  public setEffect(effect: MapEntityEffect): void {
    this.effect = effect
  }

  public getShape(): Shape {
    return this.shape
  }
}
