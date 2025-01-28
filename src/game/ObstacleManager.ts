import type { Position, Obstacle, RoadConfig } from './types'

export class ObstacleManager {
  private obstacles: Obstacle[] = []
  private nextObstacleY: number
  private readonly config: RoadConfig

  constructor(config: RoadConfig) {
    this.config = config
    this.nextObstacleY = config.initialObstacleY
    this.generateInitialObstacles()
  }

  private generateInitialObstacles(): void {
    for (let i = 0; i < 3; i++) {
      this.generateObstacle(this.config.initialObstacleY - i * this.config.obstacleSpacing)
    }
  }

  public getObstacles(): Obstacle[] {
    return this.obstacles
  }

  public update(lastCarY: number): void {
    const visibleTop = lastCarY - 2000

    while (this.nextObstacleY > visibleTop) {
      this.generateObstacle(this.nextObstacleY)
      this.nextObstacleY -= this.config.obstacleSpacing
    }

    if (lastCarY !== 0) {
      this.obstacles = this.obstacles.filter(
        obstacle => obstacle.position.y > lastCarY - 2000 && obstacle.position.y < lastCarY + 1000
      )
    }
  }

  private generateObstacle(forcedY: number): void {
    const progress = Math.abs(forcedY)
    const useWalls = progress > this.config.wallTransitionScore

    if (useWalls) {
      this.generateWallObstacle(forcedY)
    } else {
      this.generateBoxObstacle(forcedY)
    }
  }

  private generateWallObstacle(y: number): void {
    const minGapWidth = 100
    const maxGapWidth = 200
    const gapWidth = minGapWidth + Math.random() * (maxGapWidth - minGapWidth)
    const gapPosition = -this.config.roadWidth/2 + Math.random() * (this.config.roadWidth - gapWidth)

    const leftObstacle = {
      position: {
        x: -this.config.roadWidth/2,
        y
      },
      width: gapPosition - (-this.config.roadWidth/2),
      height: this.config.obstacleHeight
    }

    const rightObstacle = {
      position: {
        x: gapPosition + gapWidth,
        y
      },
      width: this.config.roadWidth/2 - (gapPosition + gapWidth),
      height: this.config.obstacleHeight
    }

    this.obstacles.push(leftObstacle, rightObstacle)
  }

  private generateBoxObstacle(y: number): void {
    const minX = -this.config.roadWidth/2 + this.config.obstacleWidth
    const maxX = this.config.roadWidth/2 - this.config.obstacleWidth
    const obstacleX = minX + Math.random() * (maxX - minX)

    const obstacle = {
      position: {
        x: obstacleX,
        y
      },
      width: this.config.obstacleWidth,
      height: this.config.obstacleHeight
    }

    this.obstacles.push(obstacle)
  }

  public checkCollision(carWorldPos: Position, carWidth: number, carHeight: number): boolean {
    const carLeft = carWorldPos.x - carWidth/2
    const carRight = carWorldPos.x + carWidth/2
    const carTop = carWorldPos.y + carHeight/2
    const carBottom = carWorldPos.y - carHeight/2

    return this.obstacles.some(obstacle =>
      carRight > obstacle.position.x &&
      carLeft < obstacle.position.x + obstacle.width &&
      carBottom < obstacle.position.y + obstacle.height &&
      carTop > obstacle.position.y
    )
  }
}
