import type { Position, Obstacle } from './types'
import { Car } from './Car'

export class Road {
  private width: number
  private height: number
  private roadWidth = 800
  private obstacles: Obstacle[] = []
  private readonly LINE_SPACING = 80
  private lastCarY = 0
  private readonly WALL_TRANSITION_SCORE = 5000
  private readonly OBSTACLE_WIDTH = 80
  private readonly OBSTACLE_HEIGHT = 40
  private readonly OBSTACLE_SPACING = 300  // Consistent spacing between obstacles
  private nextObstacleY = -1000  // Track where the next obstacle should be

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
    // Generate initial set of obstacles
    this.generateInitialObstacles()
  }

  private generateInitialObstacles(): void {
    // Generate 3 initial obstacles with fixed spacing
    for (let i = 0; i < 3; i++) {
      this.generateObstacle(-1000 - i * this.OBSTACLE_SPACING)
    }
  }

  public resize(width: number, height: number): void {
    this.width = width
    this.height = height
  }

  public update(): void {
    // Generate new obstacles based on car position
    const visibleTop = this.lastCarY - 2000  // Generate obstacles well ahead of the car

    // Keep generating obstacles while there's space ahead
    while (this.nextObstacleY > visibleTop) {
      this.generateObstacle(this.nextObstacleY)
      this.nextObstacleY -= this.OBSTACLE_SPACING
    }

    // Clean up obstacles that are too far behind
    if (this.lastCarY !== 0) {
      this.obstacles = this.obstacles.filter(
        obstacle => obstacle.position.y > this.lastCarY - 2000 && obstacle.position.y < this.lastCarY + 1000
      )
    }
  }

  private generateObstacle(forcedY: number): void {
    const progress = Math.abs(this.lastCarY)
    const useWalls = progress > this.WALL_TRANSITION_SCORE

    if (useWalls) {
      // Generate wall with gap
      const minGapWidth = 100
      const maxGapWidth = 200
      const gapWidth = minGapWidth + Math.random() * (maxGapWidth - minGapWidth)
      const gapPosition = -this.roadWidth/2 + Math.random() * (this.roadWidth - gapWidth)

      const leftObstacle = {
        position: {
          x: -this.roadWidth/2,
          y: forcedY
        },
        width: gapPosition - (-this.roadWidth/2),
        height: this.OBSTACLE_HEIGHT
      }

      const rightObstacle = {
        position: {
          x: gapPosition + gapWidth,
          y: forcedY
        },
        width: this.roadWidth/2 - (gapPosition + gapWidth),
        height: this.OBSTACLE_HEIGHT
      }

      this.obstacles.push(leftObstacle, rightObstacle)
    } else {
      // Generate single box obstacle
      const minX = -this.roadWidth/2 + this.OBSTACLE_WIDTH
      const maxX = this.roadWidth/2 - this.OBSTACLE_WIDTH
      const obstacleX = minX + Math.random() * (maxX - minX)

      const obstacle = {
        position: {
          x: obstacleX,
          y: forcedY
        },
        width: this.OBSTACLE_WIDTH,
        height: this.OBSTACLE_HEIGHT
      }

      this.obstacles.push(obstacle)
    }
  }

  public draw(ctx: CanvasRenderingContext2D, carWorldPos: Position): void {
    this.lastCarY = carWorldPos.y

    // Convert world coordinates to screen coordinates
    const screenCenter = {
      x: ctx.canvas.width / 2,
      y: ctx.canvas.height * 0.8  // Match car's fixed screen position
    }

    // Draw grass background
    ctx.fillStyle = '#27ae60'
    ctx.fillRect(0, 0, this.width, this.height)

    // Draw road background (convert from world to screen coordinates)
    ctx.fillStyle = '#34495e'
    const roadLeft = screenCenter.x - this.roadWidth/2
    ctx.fillRect(roadLeft, 0, this.roadWidth, this.height)

    // Draw road lines
    ctx.strokeStyle = '#ffffff'
    ctx.setLineDash([40, 40])
    ctx.lineWidth = 5

    // Calculate the visible range in world coordinates
    // Extend the visible range much further above the car
    const visibleTop = carWorldPos.y - (screenCenter.y / this.height) * 2000    // Doubled the view distance
    const visibleBottom = carWorldPos.y + ((this.height - screenCenter.y) / this.height) * 1000

    // Calculate which lines should be visible in camera view
    const firstLineY = Math.floor(visibleTop / this.LINE_SPACING) * this.LINE_SPACING
    const lastLineY = Math.ceil(visibleBottom / this.LINE_SPACING) * this.LINE_SPACING

    // Convert world Y to screen Y
    const screenY = (worldY: number): number => {
      return screenCenter.y + (worldY - carWorldPos.y)
    }

    // Draw visible lines
    for (let worldY = firstLineY; worldY <= lastLineY; worldY += this.LINE_SPACING) {
      const y = screenY(worldY)

      // Extend the drawing range slightly above viewport to ensure smooth transition
      if (y >= -40 && y <= this.height) {
        // Left line
        this.drawLine(ctx, roadLeft, y, roadLeft, y + 40)

        // Right line
        this.drawLine(ctx, roadLeft + this.roadWidth, y, roadLeft + this.roadWidth, y + 40)

        // Center line (yellow)
        ctx.strokeStyle = '#f1c40f'
        this.drawLine(ctx, roadLeft + this.roadWidth/2, y, roadLeft + this.roadWidth/2, y + 40)
        ctx.strokeStyle = '#ffffff'
      }
    }

    ctx.setLineDash([])

    // Draw obstacles (converting world coordinates to screen coordinates)
    ctx.fillStyle = '#2ecc71'
    this.obstacles.forEach(obstacle => {
      const obstacleScreenY = screenY(obstacle.position.y)
      const obstacleScreenX = screenCenter.x + obstacle.position.x

      // Extend the drawing range slightly above viewport to ensure smooth transition
      if (obstacleScreenY >= -obstacle.height * 2 && obstacleScreenY <= this.height) {
        ctx.fillRect(
          obstacleScreenX,
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

    // Calculate car's bounding box in world coordinates
    // Remember: negative Y is up, so we add height/2 for top and subtract for bottom
    const carLeft = carWorldPos.x - carWidth/2
    const carRight = carWorldPos.x + carWidth/2
    const carTop = carWorldPos.y + carHeight/2    // Changed: add height/2 because negative Y is up
    const carBottom = carWorldPos.y - carHeight/2  // Changed: subtract height/2 because negative Y is up

    for (const obstacle of this.obstacles) {
      // Obstacles are already in world coordinates
      // Remember: obstacle.position.y is in world coordinates where negative is up
      if (carRight > obstacle.position.x &&
          carLeft < obstacle.position.x + obstacle.width &&
          carBottom < obstacle.position.y + obstacle.height && // Changed: car bottom should be less than obstacle top
          carTop > obstacle.position.y) {                     // Changed: car top should be greater than obstacle bottom
        return true
      }
    }
    return false
  }
}
