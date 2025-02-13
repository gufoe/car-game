import type { Position, RoadConfig } from './types'
import type { MapEntity } from './entities/MapEntity'
import { RectShape, CircleShape } from './shapes/Shape'

export class RoadRenderer {
  private config: RoadConfig
  private lightGradient: CanvasGradient | null = null
  private lastSpeed = 0
  private readonly VISIBLE_DISTANCE = 2000  // How far ahead/behind to render
  private readonly CHUNK_SIZE = 4000  // Total size of the visible road chunk

  constructor(config: RoadConfig) {
    this.config = config
  }

  public resize(width: number, height: number): void {
    this.config = { ...this.config, width, height }
  }

  public draw(ctx: CanvasRenderingContext2D, carWorldPos: Position, entities: MapEntity[], speed: number = 0): void {
    this.drawBackground(ctx, speed)
    this.drawRoad(ctx, carWorldPos)
    this.drawRoadLines(ctx, carWorldPos)
    this.drawEntities(ctx, entities)

    // Update last speed for smooth transitions
    this.lastSpeed = speed
  }

  private drawBackground(ctx: CanvasRenderingContext2D, speed: number): void {
    // Create gradient if not exists
    if (!this.lightGradient) {
      this.lightGradient = ctx.createLinearGradient(0, -ctx.canvas.height, 0, ctx.canvas.height)
      this.lightGradient.addColorStop(0, '#87CEEB')  // Sky blue
      this.lightGradient.addColorStop(1, '#E0F6FF')  // Light blue
    }

    // Draw sky
    ctx.save()
    ctx.resetTransform()  // Reset to screen coordinates for background
    ctx.fillStyle = this.lightGradient
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    ctx.restore()
  }

  private drawRoad(ctx: CanvasRenderingContext2D, carWorldPos: Position): void {
    // Draw road background relative to car position
    const visibleStart = Math.floor((carWorldPos.y - this.VISIBLE_DISTANCE) / this.CHUNK_SIZE) * this.CHUNK_SIZE
    const chunksNeeded = Math.ceil((this.VISIBLE_DISTANCE * 2) / this.CHUNK_SIZE) + 1

    ctx.fillStyle = '#303030'
    for (let i = 0; i < chunksNeeded; i++) {
      ctx.fillRect(
        -this.config.roadWidth/2,
        visibleStart + (i * this.CHUNK_SIZE),
        this.config.roadWidth,
        this.CHUNK_SIZE
      )
    }
  }

  private drawRoadLines(ctx: CanvasRenderingContext2D, carWorldPos: Position): void {
    ctx.strokeStyle = '#ffffff'
    ctx.setLineDash([40, 40])
    ctx.lineWidth = 5

    const visibleTop = carWorldPos.y - this.VISIBLE_DISTANCE
    const visibleBottom = carWorldPos.y + this.VISIBLE_DISTANCE

    const firstLineY = Math.floor(visibleTop / this.config.lineSpacing) * this.config.lineSpacing
    const lastLineY = Math.ceil(visibleBottom / this.config.lineSpacing) * this.config.lineSpacing

    for (let worldY = firstLineY; worldY <= lastLineY; worldY += this.config.lineSpacing) {
      // Left line
      this.drawLine(ctx, -this.config.roadWidth/2, worldY, -this.config.roadWidth/2, worldY + 40)

      // Right line
      this.drawLine(ctx, this.config.roadWidth/2, worldY, this.config.roadWidth/2, worldY + 40)

      // Center line (yellow)
      ctx.strokeStyle = '#f1c40f'
      this.drawLine(ctx, 0, worldY, 0, worldY + 40)
      ctx.strokeStyle = '#ffffff'
    }

    ctx.setLineDash([])
  }

  private drawEntities(ctx: CanvasRenderingContext2D, entities: MapEntity[]): void {
    entities.forEach(entity => {
      const shape = entity.getShape()
      const pos = shape.getPosition()
      entity.render(ctx, pos.x, pos.y)
    })
  }

  private drawLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }
}
