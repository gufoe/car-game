import type { Position, Obstacle } from './types'
import { Car } from './Car'

export class Road {
  private width: number
  private height: number
  private roadWidth = 800
  private obstacles: Obstacle[] = []
  private lastObstacleTime = 0
  private readonly OBSTACLE_SPAWN_INTERVAL = 2000
  private readonly LINE_SPACING = 80

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
  }

  public resize(width: number, height: number): void {
    this.width = width
    this.height = height
  }

  public update(): void {
    // Generate new obstacles
    const currentTime = Date.now()
    if (currentTime - this.lastObstacleTime > this.OBSTACLE_SPAWN_INTERVAL) {
      this.generateObstacle()
      this.lastObstacleTime = currentTime
    }
  }

  private generateObstacle(): void {
    const minGapWidth = 100
    const maxGapWidth = 200
    const gapWidth = minGapWidth + Math.random() * (maxGapWidth - minGapWidth)
    const gapPosition = (this.width - this.roadWidth) / 2 + Math.random() * (this.roadWidth - gapWidth)

    // Get the last obstacle's Y position or start from 0
    const lastObstacleY = this.obstacles.length > 0
      ? Math.min(...this.obstacles.map(o => o.position.y)) - 300 // Space between obstacles
      : 0

    const leftObstacle = {
      position: { x: (this.width - this.roadWidth) / 2, y: lastObstacleY },
      width: gapPosition - (this.width - this.roadWidth) / 2,
      height: 40
    }

    const rightObstacle = {
      position: { x: gapPosition + gapWidth, y: lastObstacleY },
      width: this.roadWidth - (gapPosition + gapWidth - (this.width - this.roadWidth) / 2),
      height: 40
    }

    this.obstacles.push(leftObstacle, rightObstacle)

    // Clean up obstacles that are too far behind
    const carY = this.lastCarY
    this.obstacles = this.obstacles.filter(
      obstacle => obstacle.position.y > carY - 1000 && obstacle.position.y < carY + 1000
    )
  }

  private lastCarY = 0 // Keep track of car's Y position for cleanup

  public draw(ctx: CanvasRenderingContext2D, carWorldPos: Position): void {
    this.lastCarY = carWorldPos.y // Update last known car position

    const roadX = (this.width - this.roadWidth) / 2
    const cameraY = carWorldPos.y // Camera follows car's Y position

    // Draw grass background
    ctx.fillStyle = '#27ae60'
    ctx.fillRect(0, 0, this.width, this.height)

    // Draw road background
    ctx.fillStyle = '#34495e'
    ctx.fillRect(roadX, 0, this.roadWidth, this.height)

    // Draw road lines
    ctx.strokeStyle = '#ffffff'
    ctx.setLineDash([40, 40])
    ctx.lineWidth = 5

    // Calculate which lines should be visible in camera view
    const firstLineY = Math.floor(cameraY / this.LINE_SPACING) * this.LINE_SPACING
    const screenY = (worldY: number): number => this.height/2 - (cameraY - worldY) // Convert world Y to screen Y

    // Draw visible lines
    for (let worldY = firstLineY - this.LINE_SPACING * 2;
         worldY <= firstLineY + this.height + this.LINE_SPACING;
         worldY += this.LINE_SPACING) {
      const y = screenY(worldY)

      // Left line
      this.drawLine(ctx, roadX, y, roadX, y + 40)

      // Right line
      this.drawLine(ctx, roadX + this.roadWidth, y, roadX + this.roadWidth, y + 40)

      // Center line (yellow)
      ctx.strokeStyle = '#f1c40f'
      this.drawLine(ctx, roadX + this.roadWidth / 2, y, roadX + this.roadWidth / 2, y + 40)
      ctx.strokeStyle = '#ffffff'
    }

    ctx.setLineDash([])

    // Draw obstacles (converting world coordinates to screen coordinates)
    ctx.fillStyle = '#2ecc71'
    this.obstacles.forEach(obstacle => {
      const obstacleScreenY = screenY(obstacle.position.y)
      // Only draw if in view
      if (obstacleScreenY > -100 && obstacleScreenY < this.height + 100) {
        ctx.fillRect(
          obstacle.position.x,
          obstacleScreenY,
          obstacle.width,
          obstacle.height
        )
      }
    })
  }

  private drawLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }

  public checkCollision(car: Car): boolean {
    const carWorldPos = car.getWorldPosition()
    const carWidth = car.getWidth()
    const carHeight = car.getHeight()

    for (const obstacle of this.obstacles) {
      if (carWorldPos.x < obstacle.position.x + obstacle.width &&
          carWorldPos.x + carWidth > obstacle.position.x &&
          carWorldPos.y < obstacle.position.y + obstacle.height &&
          carWorldPos.y + carHeight > obstacle.position.y) {
        return true
      }
    }
    return false
  }
}
