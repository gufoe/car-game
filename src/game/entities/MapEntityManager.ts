import type { Car } from '../Car'
import type { RoadConfig } from '../types'
import type { MapEntity } from './MapEntity'
import { PowerUpEntity } from './PowerUpEntity'
import { CyclistEntity } from './CyclistEntity'
import { WallObstacleEntity } from './WallObstacleEntity'
import { BoxObstacleEntity } from './BoxObstacleEntity'

export class MapEntityManager {
  private entities: MapEntity[] = []
  private nextEntityY: number
  private readonly config: RoadConfig

  constructor(config: RoadConfig) {
    this.config = config
    this.nextEntityY = config.initialObstacleY
    this.generateInitialEntities()
  }

  private generateInitialEntities(): void {
    for (let i = 0; i < 3; i++) {
      this.generateRandomEntity(this.config.initialObstacleY - i * this.config.obstacleSpacing)
    }
  }

  public getEntities(): MapEntity[] {
    return this.entities
  }

  public update(lastCarY: number, deltaTime: number): void {
    // Generate entities 2000 units ahead of the car
    const visibleTop = lastCarY - 2000
    const visibleBottom = lastCarY + 1000

    // Keep generating entities ahead of the car
    while (this.nextEntityY > visibleTop) {
      this.generateRandomEntity(this.nextEntityY)
      this.nextEntityY -= this.config.obstacleSpacing
    }

    // Update each entity
    this.entities.forEach(entity => entity.update(deltaTime))

    // Clean up entities that are too far behind the car
    this.entities = this.entities.filter(entity => {
      if (!entity.isActiveEntity()) return false
      const pos = entity.getShape().getPosition()
      return pos.y > visibleTop && pos.y < visibleBottom
    })
  }

  private generateRandomEntity(y: number): void {
    const progress = Math.abs(y)

    // As the game progresses, increase the chance of power-ups and cyclists
    const powerUpChance = Math.max(0.1, Math.min(0.3, progress / 20000)) // Max 30% chance for power-ups
    const cyclistChance = Math.max(0.6, Math.min(0.6, progress / 15000)) // Max 40% chance for cyclists

    if (Math.random() < powerUpChance) {
      this.generatePowerUp(y)
    } else if (Math.random() < cyclistChance) {
      this.generateCyclist(y)
    } else {
      if (progress > this.config.wallTransitionScore) {
        this.generateWallObstacle(y)
      } else {
        this.generateBoxObstacle(y)
      }
    }
  }

  private generatePowerUp(y: number): void {
    const minX = -this.config.roadWidth/2 + this.config.obstacleWidth
    const maxX = this.config.roadWidth/2 - this.config.obstacleWidth
    const x = minX + Math.random() * (maxX - minX)

    const powerUp = new PowerUpEntity(x, y)
    this.entities.push(powerUp)
  }

  private generateCyclist(y: number): void {
    const minX = -this.config.roadWidth/2 + 30
    const maxX = this.config.roadWidth/2 - 30
    const x = minX + Math.random() * (maxX - minX)

    const cyclist = new CyclistEntity(x, y, minX, maxX)
    this.entities.push(cyclist)
  }

  private generateWallObstacle(y: number): void {
    const walls = WallObstacleEntity.createGap(
      y,
      this.config.roadWidth,
      100, // minGapWidth
      200, // maxGapWidth
      this.config.obstacleHeight
    )
    this.entities.push(...walls)
  }

  private generateBoxObstacle(y: number): void {
    const minX = -this.config.roadWidth/2 + this.config.obstacleWidth
    const maxX = this.config.roadWidth/2 - this.config.obstacleWidth
    const x = minX + Math.random() * (maxX - minX)

    const boxObstacle = new BoxObstacleEntity(x, y, this.config.obstacleWidth, this.config.obstacleHeight)
    this.entities.push(boxObstacle)
  }

  public checkCollision(car: Car): boolean {
    const carShape = car.getShape()
    let hasCollision = false

    this.entities.forEach(entity => {
      if (entity.isActiveEntity() && entity.getShape().collidesWith(carShape)) {
        entity.handleCollision(car)
        hasCollision = true
      }
    })

    return hasCollision
  }

  public render(ctx: CanvasRenderingContext2D): void {
    this.entities.forEach(entity => {
      if (entity.isActiveEntity()) {
        entity.render(ctx)
      }
    })
  }
}
