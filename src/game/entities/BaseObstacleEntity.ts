import type { Car } from '../Car'
import { RectShapeImpl } from '../shapes/Shape'
import { MapEntity } from './MapEntity'

export abstract class BaseObstacleEntity extends MapEntity {
  constructor(x: number, y: number, width: number, height: number) {
    const shape = new RectShapeImpl(x, y, width, height)
    super(shape.getShapeData())
  }

  protected static drawWarningStripes(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    const stripeWidth = height / 3.5
    const stripeSpacing = stripeWidth * 2

    ctx.save()
    ctx.beginPath()
    ctx.rect(x - width/2, y - height/2, width, height)
    ctx.clip()

    // Black stripes
    ctx.fillStyle = '#000000'
    for (let i = -width; i < width * 2; i += stripeSpacing) {
      ctx.fillRect(x - width/2 + i, y - height/2, stripeWidth, height)
    }

    // Yellow stripes
    ctx.fillStyle = '#FFD700'
    for (let i = -width + stripeWidth; i < width * 2; i += stripeSpacing) {
      ctx.fillRect(x - width/2 + i, y - height/2, stripeWidth, height)
    }
    ctx.restore()
  }

  protected draw(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    // Draw base obstacle
    ctx.fillStyle = '#4a4a4a'
    ctx.fillRect(x - width/2, y - height/2, width, height)

    // Add warning stripes
    BaseObstacleEntity.drawWarningStripes(ctx, x, y, width, height)
  }

  public onHit(car: Car): void {
    car.crash() // Signal game over
  }
}
