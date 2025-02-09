import type { Position, RoadConfig } from './types'
import type { MapEntity } from './entities/MapEntity'

export class RoadRenderer {
  private config: RoadConfig
  private lightGradient: CanvasGradient | null = null
  private lastSpeed = 0

  constructor(config: RoadConfig) {
    this.config = config
  }

  public resize(width: number, height: number): void {
    this.config = { ...this.config, width, height }
  }

  public draw(ctx: CanvasRenderingContext2D, carWorldPos: Position, entities: MapEntity[], speed: number = 0): void {
    const screenCenter = {
      x: ctx.canvas.width / 2,
      y: ctx.canvas.height * this.config.screenCenterYRatio
    }

    this.drawBackground(ctx, speed)
    this.drawRoad(ctx, screenCenter, speed)
    this.drawRoadLines(ctx, carWorldPos, screenCenter)
    this.drawEntities(ctx, carWorldPos, entities, screenCenter)

    // Update last speed for smooth transitions
    this.lastSpeed = speed
  }

  private drawBackground(ctx: CanvasRenderingContext2D, speed: number): void {
    // Create gradient if not exists
    if (!this.lightGradient) {
      this.lightGradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height)
      this.lightGradient.addColorStop(0, '#87CEEB')  // Sky blue
      this.lightGradient.addColorStop(1, '#E0F6FF')  // Light blue
    }

    // Draw sky
    ctx.fillStyle = this.lightGradient
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  }

  private drawRoad(ctx: CanvasRenderingContext2D, screenCenter: Position, speed: number): void {
    // Draw road background
    ctx.fillStyle = '#303030'
    ctx.fillRect(
      screenCenter.x - this.config.roadWidth/2,
      0,
      this.config.roadWidth,
      ctx.canvas.height
    )
  }

  private drawRoadLines(
    ctx: CanvasRenderingContext2D,
    carWorldPos: Position,
    screenCenter: Position
  ): void {
    const roadLeft = screenCenter.x - this.config.roadWidth/2

    ctx.strokeStyle = '#ffffff'
    ctx.setLineDash([40, 40])
    ctx.lineWidth = 5

    const visibleTop = carWorldPos.y - (screenCenter.y / this.config.height) * 2000
    const visibleBottom = carWorldPos.y + ((this.config.height - screenCenter.y) / this.config.height) * 1000

    const firstLineY = Math.floor(visibleTop / this.config.lineSpacing) * this.config.lineSpacing
    const lastLineY = Math.ceil(visibleBottom / this.config.lineSpacing) * this.config.lineSpacing

    for (let worldY = firstLineY; worldY <= lastLineY; worldY += this.config.lineSpacing) {
      const y = this.worldToScreenY(worldY, carWorldPos.y, screenCenter.y)

      if (y >= -40 && y <= this.config.height) {
        // Left line
        this.drawLine(ctx, roadLeft, y, roadLeft, y + 40)

        // Right line
        this.drawLine(ctx, roadLeft + this.config.roadWidth, y, roadLeft + this.config.roadWidth, y + 40)

        // Center line (yellow)
        ctx.strokeStyle = '#f1c40f'
        this.drawLine(ctx, roadLeft + this.config.roadWidth/2, y, roadLeft + this.config.roadWidth/2, y + 40)
        ctx.strokeStyle = '#ffffff'
      }
    }

    ctx.setLineDash([])
  }

  private drawEntities(
    ctx: CanvasRenderingContext2D,
    carWorldPos: Position,
    entities: MapEntity[],
    screenCenter: Position
  ): void {
    entities.forEach(entity => {
      const entityScreenY = this.worldToScreenY(entity.position.y, carWorldPos.y, screenCenter.y)
      const entityScreenX = screenCenter.x + entity.position.x

      if (entityScreenY >= -entity.height * 2 && entityScreenY <= this.config.height) {
        entity.render(ctx, entityScreenX, entityScreenY)
      }
    })
  }

  private drawLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }

  private worldToScreenY(worldY: number, carWorldY: number, screenCenterY: number): number {
    const relativeY = worldY - carWorldY
    const perspectiveScale = 1 + (relativeY / 5000)  // Adjust perspective scaling
    return screenCenterY + (relativeY * perspectiveScale)
  }
}
