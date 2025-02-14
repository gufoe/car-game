import type { Car } from '../Car'
import { CircleShapeImpl } from '../shapes/Shape'
import { MapEntity, type MapEntityEffect } from './MapEntity'

export class PowerUpEntity extends MapEntity {
  private static readonly RADIUS = 20
  private static readonly DURATION = 5000 // 5 seconds

  constructor(x: number, y: number) {
    const shape = new CircleShapeImpl(x, y, PowerUpEntity.RADIUS)
    super(shape.getShapeData())
  }

  public static create(x: number, y: number): PowerUpEntity {
    return new PowerUpEntity(x, y)
  }

  protected draw(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    // Draw speed boost power-up
    ctx.fillStyle = '#00ff00'
    ctx.beginPath()
    ctx.moveTo(x, y - height/2)  // Top center
    ctx.lineTo(x + width/2, y + height/2)  // Bottom right
    ctx.lineTo(x - width/2, y + height/2)  // Bottom left
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
