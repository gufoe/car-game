import type { Position, Obstacle, RoadConfig } from './types'

export class RoadRenderer {
  private config: RoadConfig

  constructor(config: RoadConfig) {
    this.config = config
  }

  public resize(width: number, height: number): void {
    this.config = { ...this.config, width, height }
  }

  public draw(ctx: CanvasRenderingContext2D, carWorldPos: Position, obstacles: Obstacle[]): void {
    const screenCenter = {
      x: ctx.canvas.width / 2,
      y: ctx.canvas.height * this.config.screenCenterYRatio
    }

    this.drawBackground(ctx)
    this.drawRoad(ctx, screenCenter)
    this.drawRoadLines(ctx, carWorldPos, screenCenter)
    this.drawObstacles(ctx, carWorldPos, obstacles, screenCenter)
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#27ae60'
    ctx.fillRect(0, 0, this.config.width, this.config.height)
  }

  private drawRoad(ctx: CanvasRenderingContext2D, screenCenter: Position): void {
    ctx.fillStyle = '#34495e'
    const roadLeft = screenCenter.x - this.config.roadWidth/2
    ctx.fillRect(roadLeft, 0, this.config.roadWidth, this.config.height)
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

  private drawObstacles(
    ctx: CanvasRenderingContext2D,
    carWorldPos: Position,
    obstacles: Obstacle[],
    screenCenter: Position
  ): void {
    ctx.fillStyle = '#2ecc71'
    obstacles.forEach(obstacle => {
      const obstacleScreenY = this.worldToScreenY(obstacle.position.y, carWorldPos.y, screenCenter.y)
      const obstacleScreenX = screenCenter.x + obstacle.position.x

      if (obstacleScreenY >= -obstacle.height * 2 && obstacleScreenY <= this.config.height) {
        ctx.fillRect(
          obstacleScreenX,
          obstacleScreenY,
          obstacle.width,
          obstacle.height
        )
      }
    })
  }

  private worldToScreenY(worldY: number, carWorldY: number, screenCenterY: number): number {
    return screenCenterY + (worldY - carWorldY)
  }

  private drawLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }
}
