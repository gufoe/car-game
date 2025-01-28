import type { Position, Obstacle } from './types'
import { Car } from './Car'

export class Road {
  private width: number
  private height: number
  private roadWidth = 800
  private scrollPosition = 0
  private obstacles: Obstacle[] = []
  private lastObstacleTime = 0
  private readonly OBSTACLE_SPAWN_INTERVAL = 2000

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
  }

  public resize(width: number, height: number): void {
    this.width = width
    this.height = height
  }

  public update(verticalVelocity: number): void {
    // Update scroll position
    this.scrollPosition += verticalVelocity

    // Update obstacles
    this.obstacles.forEach(obstacle => {
      obstacle.position.y -= verticalVelocity
    })

    // Remove off-screen obstacles
    this.obstacles = this.obstacles.filter(
      obstacle => obstacle.position.y < this.height && obstacle.position.y > -100
    )

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

    const leftObstacle = {
      position: { x: (this.width - this.roadWidth) / 2, y: -100 },
      width: gapPosition - (this.width - this.roadWidth) / 2,
      height: 40
    }

    const rightObstacle = {
      position: { x: gapPosition + gapWidth, y: -100 },
      width: this.roadWidth - (gapPosition + gapWidth - (this.width - this.roadWidth) / 2),
      height: 40
    }

    this.obstacles.push(leftObstacle, rightObstacle)
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    const roadX = (this.width - this.roadWidth) / 2

    // Draw grass background
    ctx.fillStyle = '#27ae60'
    ctx.fillRect(0, 0, this.width, this.height)

    // Draw road background
    ctx.fillStyle = '#34495e'
    ctx.fillRect(roadX, 0, this.roadWidth, this.height)

    // Draw road lines
    const lineSpacing = 80
    const offset = this.scrollPosition % lineSpacing

    // Draw side lines
    ctx.strokeStyle = '#ffffff'
    ctx.setLineDash([40, 40])
    ctx.lineWidth = 5

    for (let y = offset; y < this.height + lineSpacing; y += lineSpacing) {
      // Left line
      ctx.beginPath()
      ctx.moveTo(roadX, y)
      ctx.lineTo(roadX, y + 40)
      ctx.stroke()

      // Right line
      ctx.beginPath()
      ctx.moveTo(roadX + this.roadWidth, y)
      ctx.lineTo(roadX + this.roadWidth, y + 40)
      ctx.stroke()

      // Center line
      ctx.strokeStyle = '#f1c40f'
      ctx.beginPath()
      ctx.moveTo(roadX + this.roadWidth / 2, y)
      ctx.lineTo(roadX + this.roadWidth / 2, y + 40)
      ctx.stroke()
    }

    ctx.setLineDash([])

    // Draw obstacles
    ctx.fillStyle = '#2ecc71'
    this.obstacles.forEach(obstacle => {
      ctx.fillRect(
        obstacle.position.x,
        obstacle.position.y,
        obstacle.width,
        obstacle.height
      )
    })
  }

  public checkCollision(car: Car): boolean {
    const carPos = car.getPosition()
    const carWidth = car.getWidth()
    const carHeight = car.getHeight()

    for (const obstacle of this.obstacles) {
      if (carPos.x < obstacle.position.x + obstacle.width &&
          carPos.x + carWidth > obstacle.position.x &&
          carPos.y < obstacle.position.y + obstacle.height &&
          carPos.y + carHeight > obstacle.position.y) {
        return true
      }
    }
    return false
  }
}
