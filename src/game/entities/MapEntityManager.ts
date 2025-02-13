import type { Car } from '../Car'
import { CircleShape, RectShape } from '../shapes/Shape'
import type { RoadConfig } from '../types'
import { MapEntity, type MapEntityEffect } from './MapEntity'

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
    const cyclistChance = Math.max(0.15, Math.min(0.4, progress / 15000)) // Max 40% chance for cyclists

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

    // Randomly choose between speed boost and other future power-ups
    const powerUpTypes = ['speedBoost']
    const powerUpType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)]

    if (powerUpType === 'speedBoost') {
      const speedBoost = new MapEntity({
        shape: new CircleShape(x, y, 20), // Use a circle shape for power-ups
        duration: 5000, // 5 seconds
        deactivateOnHit: true, // Power-ups should disappear when collected
        draw: (ctx, x, y, width, height) => {
          // Draw speed boost power-up
          ctx.fillStyle = '#00ff00'
          ctx.beginPath()
          ctx.moveTo(x, y - height/2)  // Top center
          ctx.lineTo(x + width/2, y + height/2)  // Bottom right
          ctx.lineTo(x - width/2, y + height/2)  // Bottom left
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

  private generateCyclist(y: number): void {
    const minX = -this.config.roadWidth/2 + 30
    const maxX = this.config.roadWidth/2 - 30
    const x = minX + Math.random() * (maxX - minX)
    const size = 30 // Cyclist size
    const radius = size / 2 // Collision radius

    const BLOOD_DURATION = 5000 // Blood stays for 5 seconds
    // Cyclist movement parameters
    const cyclistSpeed = 0.5 // Slow movement speed
    let moveDirection = Math.random() > 0.5 ? 1 : -1 // Random left/right movement
    let currentX = x
    let bloodEffects: Array<{x: number, y: number, size: number, opacity: number, timestamp: number}> = []
    let isHit = false

    const shape = new CircleShape(x, y, radius)
    const cyclist = new MapEntity({
      shape: shape,
      deactivateOnHit: false,
      draw: (ctx, x, y, width, height) => {
        ctx.save()

        // Draw blood effects with fade out
        const currentTime = performance.now()
        bloodEffects = bloodEffects.filter(effect => {
          const age = currentTime - effect.timestamp
          if (age > BLOOD_DURATION) return false

          // Calculate opacity based on age
          effect.opacity = 1 - (age / BLOOD_DURATION)

          ctx.fillStyle = `rgba(139, 0, 0, ${effect.opacity})` // Dark red with opacity
          ctx.beginPath()
          ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2)
          ctx.fill()
          return true
        })

        // Only draw cyclist if not hit
        if (!isHit) {
          // Draw bicycle
          ctx.strokeStyle = '#000000'
          ctx.lineWidth = 2

          // Wheels
          ctx.beginPath()
          ctx.arc(x - size/4, y + size/4, size/4, 0, Math.PI * 2)
          ctx.stroke()
          ctx.beginPath()
          ctx.arc(x + size/4, y + size/4, size/4, 0, Math.PI * 2)
          ctx.stroke()

          // Frame
          ctx.beginPath()
          ctx.moveTo(x - size/4, y + size/4)
          ctx.lineTo(x, y - size/4)
          ctx.lineTo(x + size/4, y + size/4)
          ctx.stroke()

          // Handlebars
          ctx.beginPath()
          ctx.moveTo(x - size/6, y - size/6)
          ctx.lineTo(x + size/6, y - size/6)
          ctx.stroke()

          // Person
          ctx.fillStyle = '#FF6B6B'
          ctx.beginPath()
          ctx.arc(x, y - size/3, size/6, 0, Math.PI * 2) // Head
          ctx.fill()

          // Debug: always show collision circle
          ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)'
          ctx.beginPath()
          ctx.arc(x, y, radius, 0, Math.PI * 2)
          ctx.stroke()
        }

        ctx.restore()
      },
      onHit: (car) => {
        if (isHit) return // Prevent multiple hits

        isHit = true
        const now = performance.now()

        // Create blood splatter effect with more blood and larger splatter
        for (let i = 0; i < 8; i++) {
          const angle = Math.random() * Math.PI * 2
          const distance = Math.random() * 40
          bloodEffects.push({
            x: shape.getPosition().x + Math.cos(angle) * distance,
            y: shape.getPosition().y + Math.sin(angle) * distance,
            size: 4 + Math.random() * 6,
            opacity: 1,
            timestamp: now
          })
        }

        // Update game score through car's effect system
        const scoreEffect: MapEntityEffect = {
          type: 'score',
          value: 100,
          duration: 0,
        }
        car.applyEffect(scoreEffect)

        // Make the car longer
        const sizeEffect: MapEntityEffect = {
          type: 'size',
          value: 20, // Increase car length by 20 pixels per cyclist
          duration: 0, // Permanent effect
        }
        car.applyEffect(sizeEffect)
      },
      onUpdate: (deltaTime: number) => {
        // Always update blood effects, even if hit
        const currentTime = performance.now()
        bloodEffects = bloodEffects.filter(effect => {
          const age = currentTime - effect.timestamp
          return age <= BLOOD_DURATION
        })

        if (isHit) return // Don't move if hit

        // Update cyclist position
        currentX += cyclistSpeed * moveDirection * deltaTime / 16

        // Bounce off road edges
        if (currentX < minX) {
          currentX = minX
          moveDirection *= -1
        } else if (currentX > maxX) {
          currentX = maxX
          moveDirection *= -1
        }

        // Update collision shape position
        shape.setPosition(currentX, y)
      }
    })

    this.entities.push(cyclist)
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
          ctx.fillRect(x - width/2, y - height/2, width, height)

          // Add warning stripes
          const stripeWidth = height / 3.5
          const stripeSpacing = stripeWidth * 2

          ctx.save()
          ctx.beginPath()
          ctx.rect(x - width/2, y - height/2, width, height)
          ctx.clip()

          // Black stripes
          ctx.fillStyle = '#000000'
          for (let i = -width; i < width * 2; i += stripeSpacing) {
            ctx.fillRect(x - width/2 + i, y - height/2, stripeWidth, height)
          }

          // Yellow stripes
          ctx.fillStyle = '#FFD700'
          for (let i = -width + stripeWidth; i < width * 2; i += stripeSpacing) {
            ctx.fillRect(x - width/2 + i, y - height/2, stripeWidth, height)
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
        ctx.fillRect(x - width/2, y - height/2, width, height)

        // Add warning stripes
        const stripeWidth = height / 3.5
        const stripeSpacing = stripeWidth * 2

        ctx.save()
        ctx.beginPath()
        ctx.rect(x - width/2, y - height/2, width, height)
        ctx.clip()

        // Black stripes
        ctx.fillStyle = '#000000'
        for (let i = -width; i < width * 2; i += stripeSpacing) {
          ctx.fillRect(x - width/2 + i, y - height/2, stripeWidth, height)
        }

        // Yellow stripes
        ctx.fillStyle = '#FFD700'
        for (let i = -width + stripeWidth; i < width * 2; i += stripeSpacing) {
          ctx.fillRect(x - width/2 + i, y - height/2, stripeWidth, height)
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
