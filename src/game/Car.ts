import type { Position, Controls } from './types'

export class Car {
  private position: Position
  private rotation = 0
  private velocity = 0
  private readonly width = 50
  private readonly height = 90
  private readonly maxSpeed = 10
  private readonly acceleration = 0.2
  private readonly deceleration = 0.1
  private readonly rotationSpeed = 0.1

  constructor(position: Position) {
    this.position = { ...position }
  }

  public update(controls: Controls): void {
    // Update rotation
    if (controls.left) this.rotation -= this.rotationSpeed
    if (controls.right) this.rotation += this.rotationSpeed

    // Update velocity
    if (controls.up) {
      this.velocity = Math.min(this.velocity + this.acceleration, this.maxSpeed)
    } else if (controls.down) {
      this.velocity = Math.max(this.velocity - this.acceleration, -this.maxSpeed / 2)
    } else {
      // Apply deceleration when no controls are pressed
      if (Math.abs(this.velocity) < this.deceleration) {
        this.velocity = 0
      } else {
        this.velocity -= Math.sign(this.velocity) * this.deceleration
      }
    }

    // Update position based on velocity and rotation
    this.position.x += Math.sin(this.rotation) * this.velocity
    this.position.y -= Math.cos(this.rotation) * this.velocity
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    ctx.translate(this.position.x + this.width / 2, this.position.y + this.height / 2)
    ctx.rotate(this.rotation)

    // Create Ferrari red gradient for the body
    const bodyGradient = ctx.createLinearGradient(-this.width/2, -this.height/2, this.width/2, this.height/2)
    bodyGradient.addColorStop(0, '#FF2800')
    bodyGradient.addColorStop(0.5, '#FF0000')
    bodyGradient.addColorStop(1, '#CC0000')

    // Draw main body
    ctx.fillStyle = bodyGradient
    ctx.beginPath()
    ctx.moveTo(-this.width/2, -this.height/2)
    ctx.lineTo(this.width/2, -this.height/2)
    ctx.lineTo(this.width/2, this.height/2)
    ctx.lineTo(-this.width/2, this.height/2)
    ctx.closePath()
    ctx.fill()

    // Draw windshield
    const windshieldGradient = ctx.createLinearGradient(
      -this.width/4, -this.height/4,
      this.width/4, -this.height/6
    )
    windshieldGradient.addColorStop(0, '#1a1a1a')
    windshieldGradient.addColorStop(1, '#4a4a4a')

    ctx.fillStyle = windshieldGradient
    ctx.beginPath()
    ctx.moveTo(-this.width/3, -this.height/4)
    ctx.lineTo(this.width/3, -this.height/4)
    ctx.lineTo(this.width/4, -this.height/6)
    ctx.lineTo(-this.width/4, -this.height/6)
    ctx.closePath()
    ctx.fill()

    // Draw headlights
    ctx.fillStyle = '#FFD700'
    ctx.beginPath()
    ctx.arc(-this.width/4, -this.height/2 + 5, 5, 0, Math.PI * 2)
    ctx.arc(this.width/4, -this.height/2 + 5, 5, 0, Math.PI * 2)
    ctx.fill()

    // Draw rear wing
    ctx.fillStyle = '#000000'
    ctx.fillRect(-this.width/2 - 5, this.height/2 - 10, this.width + 10, 5)

    // Draw side mirrors
    ctx.fillStyle = '#333333'
    ctx.fillRect(-this.width/2 - 3, -this.height/4, 3, 10)
    ctx.fillRect(this.width/2, -this.height/4, 3, 10)

    // Draw racing stripes
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(-this.width/6, -this.height/2, 5, this.height)
    ctx.fillRect(this.width/6, -this.height/2, 5, this.height)

    ctx.restore()
  }

  public getPosition(): Position {
    return { ...this.position }
  }

  public getWidth(): number {
    return this.width
  }

  public getHeight(): number {
    return this.height
  }

  public getVelocity(): number {
    return this.velocity
  }

  public getRotation(): number {
    return this.rotation
  }
}
