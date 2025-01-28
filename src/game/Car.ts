import type { Position, Controls } from './types'

export class Car {
  private worldPosition: Position   // Position in world coordinates
  private readonly width = 50
  private readonly height = 90
  private rotation = 0             // 0 means pointing up
  private velocity = 0
  private readonly maxSpeed = 10
  private readonly acceleration = 0.2
  private readonly deceleration = 0.1
  private readonly rotationSpeed = 0.05  // Reduced for better control

  constructor(screenWidth: number, screenHeight: number) {
    // Start at the bottom center of the screen in world coordinates
    this.worldPosition = {
      x: 0,
      y: 0
    }
  }

  public update(controls: Controls): void {
    // Update rotation (positive for right turn, negative for left)
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

    // Update world position based on velocity and rotation
    // When rotation is 0, car moves up (negative Y)
    // When rotation is PI/2, car moves right (positive X)
    this.worldPosition.x += Math.sin(this.rotation) * this.velocity
    this.worldPosition.y -= Math.cos(this.rotation) * this.velocity  // Negative because Y increases downward
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save()

    // Position car at the bottom center of the screen
    const screenX = ctx.canvas.width / 2 + this.worldPosition.x
    const screenY = ctx.canvas.height * 0.8

    // Draw at screen position
    ctx.translate(screenX, screenY)
    ctx.rotate(this.rotation)  // Positive rotation for clockwise turn

    // Draw car body
    this.drawCarBody(ctx)

    ctx.restore()
  }

  private drawCarBody(ctx: CanvasRenderingContext2D): void {
    // Draw main body (pointing up by default)
    const bodyGradient = ctx.createLinearGradient(-this.width/2, -this.height/2, this.width/2, this.height/2)
    bodyGradient.addColorStop(0, '#FF2800')
    bodyGradient.addColorStop(0.5, '#FF0000')
    bodyGradient.addColorStop(1, '#CC0000')

    ctx.fillStyle = bodyGradient
    ctx.beginPath()
    ctx.moveTo(0, -this.height/2)          // Top center (front of car)
    ctx.lineTo(this.width/2, this.height/2) // Bottom right
    ctx.lineTo(-this.width/2, this.height/2) // Bottom left
    ctx.closePath()
    ctx.fill()

    // Draw windshield
    const windshieldGradient = ctx.createLinearGradient(
      -this.width/4, -this.height/3,
      this.width/4, -this.height/4
    )
    windshieldGradient.addColorStop(0, '#1a1a1a')
    windshieldGradient.addColorStop(1, '#4a4a4a')

    ctx.fillStyle = windshieldGradient
    ctx.beginPath()
    ctx.moveTo(0, -this.height/3)          // Top center
    ctx.lineTo(this.width/3, -this.height/4) // Right
    ctx.lineTo(-this.width/3, -this.height/4) // Left
    ctx.closePath()
    ctx.fill()

    // Draw headlights
    ctx.fillStyle = '#FFD700'
    ctx.beginPath()
    ctx.arc(-this.width/4, -this.height/3, 4, 0, Math.PI * 2)
    ctx.arc(this.width/4, -this.height/3, 4, 0, Math.PI * 2)
    ctx.fill()

    // Draw rear wing
    ctx.fillStyle = '#000000'
    ctx.fillRect(-this.width/2 - 5, this.height/3, this.width + 10, 5)

    // Draw racing stripes
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(-this.width/8, -this.height/2, 4, this.height)
    ctx.fillRect(this.width/8, -this.height/2, 4, this.height)
  }

  public getWorldPosition(): Position {
    return { ...this.worldPosition }
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

  public getVerticalVelocity(): number {
    return -Math.cos(this.rotation) * this.velocity  // Negative because Y increases downward
  }
}
