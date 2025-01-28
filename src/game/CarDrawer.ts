import type { Position } from './types'

export interface CarColors {
  body: string
  windows: string
  wheels: string
  details: string
}

export const DEFAULT_CAR_COLORS: CarColors = {
  body: '#FF0000',
  windows: '#1a1a1a',
  wheels: '#333333',
  details: '#FFFFFF'
}

export class CarDrawer {
  private readonly colors: CarColors
  private readonly MAX_WHEEL_ANGLE = Math.PI / 4  // 45 degrees max turn

  constructor(colors: Partial<CarColors> = {}) {
    this.colors = { ...DEFAULT_CAR_COLORS, ...colors }
  }

  public drawCar(ctx: CanvasRenderingContext2D, width: number, height: number, steeringAngle: number = 0): void {
    // Draw in this order for proper layering
    this.drawShadow(ctx, width, height)
    this.drawBody(ctx, width, height)
    this.drawWindows(ctx, width, height)
    this.drawWheels(ctx, width, height, steeringAngle)
    this.drawDetails(ctx, width, height)
  }

  private drawShadow(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
    ctx.fillRect(-width * 0.4, height * 0.3, width * 0.8, height * 0.1)
  }

  private drawBody(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.fillStyle = this.colors.body
    ctx.fillRect(-width/2, -height/2, width, height)
  }

  private drawWindows(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.fillStyle = this.colors.windows

    // Windshield
    const windshieldWidth = width * 0.6
    const windshieldHeight = height * 0.2
    ctx.fillRect(-windshieldWidth/2, -height * 0.3, windshieldWidth, windshieldHeight)

    // Side windows
    const sideWindowWidth = width * 0.1
    const sideWindowHeight = height * 0.3
    ctx.fillRect(-width/2, -height * 0.2, sideWindowWidth, sideWindowHeight)
    ctx.fillRect(width/2 - sideWindowWidth, -height * 0.2, sideWindowWidth, sideWindowHeight)
  }

  private drawWheels(ctx: CanvasRenderingContext2D, width: number, height: number, steeringAngle: number): void {
    const wheelWidth = width * 0.15
    const wheelHeight = height * 0.15
    const wheelPositions = [
      { x: -width/2, y: -height/4, isFront: true },   // Front left
      { x: width/2, y: -height/4, isFront: true },    // Front right
      { x: -width/2, y: height/4, isFront: false },   // Rear left
      { x: width/2, y: height/4, isFront: false }     // Rear right
    ]

    wheelPositions.forEach(pos => {
      const wheelAngle = pos.isFront ? steeringAngle : 0
      this.drawWheel(ctx, pos.x, pos.y, wheelWidth, wheelHeight, wheelAngle)
    })
  }

  private drawWheel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    angle: number = 0
  ): void {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)

    // Draw wheel as a rectangle with a line indicating direction
    ctx.fillStyle = this.colors.wheels
    ctx.fillRect(-width/2, -height/2, width, height)

    // Add direction indicator line
    ctx.strokeStyle = this.colors.details
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, -height/2)
    ctx.lineTo(0, height/2)
    ctx.stroke()

    ctx.restore()
  }

  private drawDetails(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.fillStyle = this.colors.details

    // Racing stripes
    const stripeWidth = width * 0.08
    ctx.fillRect(-stripeWidth/2, -height/2, stripeWidth, height)
    ctx.fillRect(-stripeWidth * 2, -height/2, stripeWidth/2, height)
    ctx.fillRect(stripeWidth * 1.5, -height/2, stripeWidth/2, height)

    // Rear wing
    const wingWidth = width * 1.1
    const wingHeight = height * 0.08
    ctx.fillRect(-wingWidth/2, height/3, wingWidth, wingHeight)
  }
}
