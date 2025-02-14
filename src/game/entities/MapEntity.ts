import type { Car } from '../Car'
import type { ShapeImpl } from '../shapes/Shape'

export interface MapEntityEffect {
  type: string
  value: number
  duration: number
  startTime?: number
}

export abstract class MapEntity {
  protected isActive: boolean = true

  public abstract getShape(): ShapeImpl
  protected abstract draw(ctx: CanvasRenderingContext2D): void
  public abstract onHit(car: Car): void



  public update(deltaTime: number): void {
    deltaTime
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

  protected deactivate(): void {
    this.isActive = false
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.isActive) return
    this.draw(ctx)
  }
}
