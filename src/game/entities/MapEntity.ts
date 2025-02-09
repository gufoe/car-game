import type { Position } from '../types'
import type { Car } from '../Car'

export interface MapEntityConfig {
  position: Position
  width: number
  height: number
  duration?: number // Duration of effect in milliseconds, if applicable
  draw?: (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => void
  onHit?: (car: Car) => void
  onUpdate?: (deltaTime: number) => void
}

export interface MapEntityEffect {
  type: string
  value: number
  duration: number
  startTime?: number
}

export class MapEntity {
  public position: Position
  public width: number
  public height: number
  private duration?: number
  private draw?: (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => void
  private onHit?: (car: Car) => void
  private onUpdate?: (deltaTime: number) => void
  private isActive: boolean = true
  private effect?: MapEntityEffect

  constructor(config: MapEntityConfig) {
    this.position = config.position
    this.width = config.width
    this.height = config.height
    this.duration = config.duration
    this.draw = config.draw
    this.onHit = config.onHit
    this.onUpdate = config.onUpdate
  }

  public handleCollision(car: Car): void {
    if (this.isActive && this.onHit) {
      this.onHit(car)
      // If this is a one-time effect entity, deactivate it
      if (!this.duration) {
        this.isActive = false
      }
    }
  }

  public update(deltaTime: number): void {
    if (this.isActive && this.onUpdate) {
      this.onUpdate(deltaTime)
    }
  }

  public render(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
    if (this.isActive && this.draw) {
      this.draw(ctx, screenX, screenY, this.width, this.height)
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
}
