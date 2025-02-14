import type { Car } from '../Car'
import type { Position } from '../types'
import { CircleShapeImpl } from '../shapes/Shape'
import { MapEntity, type MapEntityEffect } from './MapEntity'

interface BloodEffect {
  x: number
  y: number
  size: number
  opacity: number
  timestamp: number
}

export class CyclistEntity extends MapEntity {
  private static readonly BLOOD_DURATION = 5000 // Blood stays for 5 seconds
  private static readonly CYCLIST_SPEED = 0.5 // Slow movement speed
  private static readonly CYCLIST_SIZE = 30 // Cyclist size

  private readonly minX: number
  private readonly maxX: number
  private moveDirection: number
  private currentX: number
  private bloodEffects: BloodEffect[] = []
  private isHit: boolean = false

  constructor(x: number, y: number, minX: number, maxX: number) {
    const shape = new CircleShapeImpl(x, y, CyclistEntity.CYCLIST_SIZE / 2)
    super(shape.getShapeData())
    this.minX = minX
    this.maxX = maxX
    this.moveDirection = Math.random() > 0.5 ? 1 : -1
    this.currentX = x
  }

  public static create(x: number, y: number, minX: number, maxX: number): CyclistEntity {
    return new CyclistEntity(x, y, minX, maxX)
  }

  protected draw(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    const size = CyclistEntity.CYCLIST_SIZE
    ctx.save()

    // Draw blood effects with fade out
    const currentTime = performance.now()
    this.bloodEffects = this.bloodEffects.filter(effect => {
      const age = currentTime - effect.timestamp
      if (age > CyclistEntity.BLOOD_DURATION) return false

      // Calculate opacity based on age
      effect.opacity = 1 - (age / CyclistEntity.BLOOD_DURATION)

      ctx.fillStyle = `rgba(139, 0, 0, ${effect.opacity})` // Dark red with opacity
      ctx.beginPath()
      ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2)
      ctx.fill()
      return true
    })

    // Only draw cyclist if not hit
    if (!this.isHit) {
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
      ctx.arc(x, y, size/2, 0, Math.PI * 2)
      ctx.stroke()
    }

    ctx.restore()
  }

  public onHit(car: Car): void {
    if (this.isHit) return // Prevent multiple hits

    this.isHit = true
    const now = performance.now()

    // Create blood splatter effect
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2
      const distance = Math.random() * 40
      const pos = this.shape.getPosition()
      this.bloodEffects.push({
        x: pos.x + Math.cos(angle) * distance,
        y: pos.y + Math.sin(angle) * distance,
        size: 4 + Math.random() * 6,
        opacity: 1,
        timestamp: now
      })
    }

    // Update game score
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
  }

  public override update(deltaTime: number): void {
    // Always update blood effects, even if hit
    const currentTime = performance.now()
    this.bloodEffects = this.bloodEffects.filter(effect => {
      const age = currentTime - effect.timestamp
      return age <= CyclistEntity.BLOOD_DURATION
    })

    if (this.isHit) return // Don't move if hit

    // Update cyclist position
    this.currentX += CyclistEntity.CYCLIST_SPEED * this.moveDirection * deltaTime / 16

    // Bounce off road edges
    if (this.currentX < this.minX) {
      this.currentX = this.minX
      this.moveDirection *= -1
    } else if (this.currentX > this.maxX) {
      this.currentX = this.maxX
      this.moveDirection *= -1
    }

    // Update shape position
    this.shape.setPosition(this.currentX, this.shape.getPosition().y)
  }
}
