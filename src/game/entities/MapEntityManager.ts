import type { Position, RoadConfig } from '../types'
import type { Car } from '../Car'
import { MapEntity, type MapEntityEffect } from './MapEntity'
import { CircleShape, RectShape } from '../shapes/Shape'

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
    const visibleTop = lastCarY - 2000

    while (this.nextEntityY > visibleTop) {
      this.generateRandomEntity(this.nextEntityY)
      this.nextEntityY -= this.config.obstacleSpacing
    }

    // Update each entity
    this.entities.forEach(entity => entity.update(deltaTime))

    // Clean up inactive or out-of-view entities
    if (lastCarY !== 0) {
      this.entities = this.entities.filter(entity => {
        if (!entity.isActiveEntity()) return false
        const pos = entity.getShape().getPosition()
        return pos.y > lastCarY - 2000 && pos.y < lastCarY + 1000
      })
    }
  }

  private generateRandomEntity(y: number): void {
    const progress = Math.abs(y)

    // As the game progresses, increase the chance of power-ups
    const powerUpChance = Math.min(0.3, progress / 20000) // Max 30% chance for power-ups

    if (Math.random() < powerUpChance) {
      this.generatePowerUp(y)
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

    // Randomly choose between speed boost and other future power-ups
    const powerUpTypes = ['speedBoost']
    const powerUpType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)]

    if (powerUpType === 'speedBoost') {
      const speedBoost = new MapEntity({
        shape: new CircleShape(x, y, 20), // Use a circle shape for power-ups
        duration: 5000, // 5 seconds
        draw: (ctx, x, y, width, height) => {
          // Draw speed boost power-up
          ctx.fillStyle = '#00ff00'
          ctx.beginPath()
          ctx.moveTo(x + width/2, y)
          ctx.lineTo(x + width, y + height)
          ctx.lineTo(x, y + height)
          ctx.closePath()
          ctx.fill()

          // Add glow effect
          ctx.shadowColor = '#00ff00'
          ctx.shadowBlur = 10
          ctx.fill()
          ctx.shadowBlur = 0
        },
        onHit: (car) => {
          const speedBoostEffect: MapEntityEffect = {
            type: 'maxSpeed',
            value: 1.5, // 50% speed boost
            duration: 5000,
          }
          car.applyEffect(speedBoostEffect)
        }
      })
      this.entities.push(speedBoost)
    }
  }

  private generateWallObstacle(y: number): void {
    const minGapWidth = 100
    const maxGapWidth = 200
    const gapWidth = minGapWidth + Math.random() * (maxGapWidth - minGapWidth)
    const gapPosition = -this.config.roadWidth/2 + Math.random() * (this.config.roadWidth - gapWidth)

    const createWallSection = (x: number, width: number) => {
      return new MapEntity({
        shape: new RectShape(x, y, width, this.config.obstacleHeight),
        draw: (ctx, x, y, width, height) => {
          // Draw wall section with the same style as before
          ctx.fillStyle = '#4a4a4a'
          ctx.fillRect(x, y, width, height)

          // Add warning stripes
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
        },
        onHit: (car) => {
          car.crash() // Signal game over
        }
      })
    }

    const leftWall = createWallSection(
      -this.config.roadWidth/2,
      gapPosition - (-this.config.roadWidth/2)
    )

    const rightWall = createWallSection(
      gapPosition + gapWidth,
      this.config.roadWidth/2 - (gapPosition + gapWidth)
    )

    this.entities.push(leftWall, rightWall)
  }

  private generateBoxObstacle(y: number): void {
    const minX = -this.config.roadWidth/2 + this.config.obstacleWidth
    const maxX = this.config.roadWidth/2 - this.config.obstacleWidth
    const x = minX + Math.random() * (maxX - minX)

    const boxObstacle = new MapEntity({
      shape: new RectShape(x, y, this.config.obstacleWidth, this.config.obstacleHeight),
      draw: (ctx, x, y, width, height) => {
        // Draw box obstacle with the same style as before
        ctx.fillStyle = '#4a4a4a'
        ctx.fillRect(x, y, width, height)

        // Add warning stripes
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
      },
      onHit: (car) => {
        car.crash() // Signal game over
      }
    })

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
}
