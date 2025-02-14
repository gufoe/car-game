import type { Car } from '../Car'
import { CircleShapeImpl } from '../shapes/Shape'
import { MapEntity, type MapEntityEffect } from './MapEntity'

export class PowerUpEntity extends MapEntity {
  private static readonly RADIUS = 20
  private static readonly DURATION = 5000 // 5 seconds
  private readonly shape: CircleShapeImpl

  constructor(x: number, y: number) {
    super()
    this.shape = new CircleShapeImpl(x, y, PowerUpEntity.RADIUS)
  }

  public getShape(): CircleShapeImpl {
    return this.shape
  }

  public static create(x: number, y: number): PowerUpEntity {
    return new PowerUpEntity(x, y)
  }

  protected draw(ctx: CanvasRenderingContext2D): void {
    const pos = this.shape.getPosition()
    const radius = PowerUpEntity.RADIUS

    // Draw speed boost power-up
    ctx.fillStyle = '#00ff00'
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y - radius)  // Top center
    ctx.lineTo(pos.x + radius, pos.y + radius)  // Bottom right
    ctx.lineTo(pos.x - radius, pos.y + radius)  // Bottom left
    ctx.closePath()
    ctx.fill()

    // Add glow effect
    ctx.shadowColor = '#00ff00'
    ctx.shadowBlur = 10
    ctx.fill()
    ctx.shadowBlur = 0
  }

  public onHit(car: Car): void {
    const speedBoostEffect: MapEntityEffect = {
      type: 'maxSpeed',
      value: 1.5, // 50% speed boost
      duration: PowerUpEntity.DURATION,
    }
    car.applyEffect(speedBoostEffect)
    this.deactivate() // Power-ups disappear when collected
  }
}
