import type { Position, Obstacle, RoadConfig } from './types'

export class RoadRenderer {
  private config: RoadConfig
  private lightGradient: CanvasGradient | null = null
  private lastSpeed = 0

  constructor(config: RoadConfig) {
    this.config = config
  }

  public resize(width: number, height: number): void {
    this.config = { ...this.config, width, height }
    this.lightGradient = null  // Reset gradient on resize
  }

  public draw(ctx: CanvasRenderingContext2D, carWorldPos: Position, obstacles: Obstacle[], speed: number = 0): void {
    const screenCenter = {
      x: ctx.canvas.width / 2,
      y: ctx.canvas.height * this.config.screenCenterYRatio
    }

    this.drawBackground(ctx, speed)
    this.drawRoad(ctx, screenCenter, speed)
    this.drawRoadLines(ctx, carWorldPos, screenCenter)
    this.drawObstacles(ctx, carWorldPos, obstacles, screenCenter)

    // Update last speed for smooth transitions
    this.lastSpeed = speed
  }

  private drawBackground(ctx: CanvasRenderingContext2D, speed: number): void {
    // Use constant values for stable lighting
    const r = 39
    const g = 174
    const b = 96

    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
    ctx.fillRect(0, 0, this.config.width, this.config.height)
  }

  private drawRoad(ctx: CanvasRenderingContext2D, screenCenter: Position, speed: number): void {
    const roadLeft = screenCenter.x - this.config.roadWidth/2

    // Create lighting gradient if not exists or needs update
    if (!this.lightGradient) {
      this.lightGradient = ctx.createLinearGradient(
        roadLeft, 0,
        roadLeft + this.config.roadWidth, 0
      )
    }

    // Use constant values for stable road color
    const baseColor = 52
    const edgeColor = Math.max(30, baseColor - 15)

    ctx.fillStyle = `rgb(${baseColor}, ${baseColor}, ${baseColor})`
    ctx.fillRect(roadLeft, 0, this.config.roadWidth, this.config.height)

    // Add road edge shadows with constant intensity
    const shadowWidth = 20
    const gradient = ctx.createLinearGradient(roadLeft - shadowWidth, 0, roadLeft + shadowWidth, 0)
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)')

    ctx.fillStyle = gradient
    ctx.fillRect(roadLeft - shadowWidth, 0, shadowWidth, this.config.height)

    const rightGradient = ctx.createLinearGradient(
      roadLeft + this.config.roadWidth - shadowWidth, 0,
      roadLeft + this.config.roadWidth + shadowWidth, 0
    )
    rightGradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)')
    rightGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

    ctx.fillStyle = rightGradient
    ctx.fillRect(roadLeft + this.config.roadWidth, 0, shadowWidth, this.config.height)
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
    obstacles.forEach(obstacle => {
      const obstacleScreenY = this.worldToScreenY(obstacle.position.y, carWorldPos.y, screenCenter.y)
      const obstacleScreenX = screenCenter.x + obstacle.position.x

      if (obstacleScreenY >= -obstacle.height * 2 && obstacleScreenY <= this.config.height) {
        const x = obstacleScreenX
        const y = obstacleScreenY
        const width = obstacle.width
        const height = obstacle.height

        // Add shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
        ctx.fillRect(x + 4, y + height + 2, width, 4)

        // Main box
        ctx.fillStyle = '#4a4a4a'
        ctx.fillRect(x, y, width, height)

        // Warning stripes
        const stripeWidth = height / 3.5
        const stripeSpacing = stripeWidth * 2

        ctx.save()
        ctx.beginPath()
        ctx.rect(x, y, width, height)
        ctx.clip()

        // Black stripes
        ctx.fillStyle = '#000000'
        for (let i = -width; i < width * 2; i += stripeSpacing) {
          ctx.fillRect(x + i, y, stripeWidth, height)
        }

        // Yellow stripes
        ctx.fillStyle = '#FFD700'
        for (let i = -width + stripeWidth; i < width * 2; i += stripeSpacing) {
          ctx.fillRect(x + i, y, stripeWidth, height)
        }
        ctx.restore()

        // Edge highlights
        const edgeWidth = 4

        // Top highlight
        ctx.fillStyle = '#6a6a6a'
        ctx.fillRect(x, y, width, edgeWidth)

        // Right highlight
        ctx.fillStyle = '#5a5a5a'
        ctx.fillRect(x + width - edgeWidth, y, edgeWidth, height)

        // Bottom shadow
        ctx.fillStyle = '#3a3a3a'
        ctx.fillRect(x, y + height - edgeWidth, width, edgeWidth)

        // Corner rivets
        const rivetRadius = 3
        const rivetInset = rivetRadius * 2
        const drawRivet = (rx: number, ry: number) => {
          // Main rivet
          ctx.fillStyle = '#6a6a6a'
          ctx.beginPath()
          ctx.arc(rx, ry, rivetRadius, 0, Math.PI * 2)
          ctx.fill()

          // Highlight
          ctx.fillStyle = '#8a8a8a'
          ctx.beginPath()
          ctx.arc(rx - 1, ry - 1, rivetRadius / 2, 0, Math.PI * 2)
          ctx.fill()
        }

        // Draw rivets only at corners
        drawRivet(x + rivetInset, y + rivetInset)
        drawRivet(x + width - rivetInset, y + rivetInset)
        drawRivet(x + rivetInset, y + height - rivetInset)
        drawRivet(x + width - rivetInset, y + height - rivetInset)
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
