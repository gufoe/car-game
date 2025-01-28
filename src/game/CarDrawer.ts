import type { Position } from './types'

export interface CarColors {
  body: string
  accent: string
  carbon: string
  wheels: string
}

export const DEFAULT_CAR_COLORS: CarColors = {
  body: '#DC0000',    // Ferrari red
  accent: '#1A1A1A',  // Dark carbon
  carbon: '#2C2C2C',  // Lighter carbon parts
  wheels: '#1A1A1A'   // Dark wheels
}

export class CarDrawer {
  private readonly colors: CarColors
  private readonly WHEELBASE = 60
  private readonly TRACK_WIDTH = 40
  private readonly WHEEL_WIDTH = 10    // Width of tire contact patch
  private readonly WHEEL_LENGTH = 14   // Length of tire contact patch
  private readonly BODY_MARGIN = 8

  constructor(colors: Partial<CarColors> = {}) {
    this.colors = { ...DEFAULT_CAR_COLORS, ...colors }
  }

  public drawCar(ctx: CanvasRenderingContext2D, width: number, height: number, steeringAngle: number = 0): void {
    this.drawShadow(ctx)
    this.drawWheels(ctx, steeringAngle)
    this.drawBody(ctx)
    this.drawAeroElements(ctx)
  }

  private drawShadow(ctx: CanvasRenderingContext2D): void {
    const bodyWidth = this.TRACK_WIDTH + (this.BODY_MARGIN * 2)
    const bodyLength = this.WHEELBASE + (this.BODY_MARGIN * 2)

    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
    ctx.beginPath()
    ctx.ellipse(0, 0, bodyWidth/2 + 2, bodyLength/2 + 2, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  private drawBody(ctx: CanvasRenderingContext2D): void {
    const bodyWidth = this.TRACK_WIDTH + (this.BODY_MARGIN * 2)
    const bodyLength = this.WHEELBASE + (this.BODY_MARGIN * 2)

    // Main body shape
    ctx.fillStyle = this.colors.body
    ctx.beginPath()

    // Nose cone (narrower and more pointed)
    ctx.moveTo(0, -bodyLength/2)

    // Left side with more complex curves
    ctx.quadraticCurveTo(-bodyWidth/8, -bodyLength/2 + 8, -bodyWidth/4, -bodyLength/3)  // Front left
    ctx.quadraticCurveTo(-bodyWidth/2.2, -bodyLength/6, -bodyWidth/2.8, 0)  // Sidepod inlet
    ctx.quadraticCurveTo(-bodyWidth/2.5, bodyLength/4, -bodyWidth/3, bodyLength/3)  // Sidepod
    ctx.quadraticCurveTo(-bodyWidth/4, bodyLength/2, -bodyWidth/8, bodyLength/2)  // Rear left

    // Rear center
    ctx.lineTo(bodyWidth/8, bodyLength/2)

    // Right side (mirrored)
    ctx.quadraticCurveTo(bodyWidth/4, bodyLength/2, bodyWidth/3, bodyLength/3)
    ctx.quadraticCurveTo(bodyWidth/2.5, bodyLength/4, bodyWidth/2.8, 0)
    ctx.quadraticCurveTo(bodyWidth/2.2, -bodyLength/6, bodyWidth/4, -bodyLength/3)
    ctx.quadraticCurveTo(bodyWidth/8, -bodyLength/2 + 8, 0, -bodyLength/2)

    ctx.fill()

    // Sidepod details
    this.drawSidepodDetails(ctx, 1)  // Right
    this.drawSidepodDetails(ctx, -1) // Left
  }

  private drawSidepodDetails(ctx: CanvasRenderingContext2D, side: number): void {
    const bodyWidth = this.TRACK_WIDTH + (this.BODY_MARGIN * 2)
    const bodyLength = this.WHEELBASE + (this.BODY_MARGIN * 2)

    // Sidepod cooling vents (darker shade)
    ctx.fillStyle = '#B00000'
    ctx.beginPath()
    ctx.moveTo(side * bodyWidth/3, -bodyLength/6)
    ctx.quadraticCurveTo(
      side * bodyWidth/2.3, 0,
      side * bodyWidth/3, bodyLength/6
    )
    ctx.lineTo(side * bodyWidth/3.5, bodyLength/6)
    ctx.quadraticCurveTo(
      side * bodyWidth/2.8, 0,
      side * bodyWidth/3.5, -bodyLength/6
    )
    ctx.fill()

    // Carbon fiber accent
    ctx.fillStyle = this.colors.carbon
    ctx.beginPath()
    ctx.moveTo(side * bodyWidth/2.8, -bodyLength/8)
    ctx.lineTo(side * bodyWidth/2.5, bodyLength/8)
    ctx.lineTo(side * bodyWidth/2.8, bodyLength/8)
    ctx.lineTo(side * bodyWidth/3, -bodyLength/8)
    ctx.fill()
  }

  private drawAeroElements(ctx: CanvasRenderingContext2D): void {
    const bodyWidth = this.TRACK_WIDTH + (this.BODY_MARGIN * 2)
    const bodyLength = this.WHEELBASE + (this.BODY_MARGIN * 2)

    // Front wing (more detailed)
    ctx.fillStyle = this.colors.accent
    ctx.beginPath()
    ctx.moveTo(-bodyWidth/1.8, -bodyLength/2 + 2)  // Left edge
    ctx.quadraticCurveTo(-bodyWidth/2, -bodyLength/2, -bodyWidth/4, -bodyLength/2 + 6)  // Left curve
    ctx.lineTo(bodyWidth/4, -bodyLength/2 + 6)  // Center section
    ctx.quadraticCurveTo(bodyWidth/2, -bodyLength/2, bodyWidth/1.8, -bodyLength/2 + 2)  // Right curve
    ctx.quadraticCurveTo(0, -bodyLength/2 - 2, -bodyWidth/1.8, -bodyLength/2 + 2)  // Front curve
    ctx.fill()

    // Rear wing (more F1-like)
    ctx.fillStyle = this.colors.accent
    ctx.beginPath()
    ctx.moveTo(-bodyWidth/2.2, bodyLength/2)
    ctx.lineTo(-bodyWidth/4, bodyLength/2 - 6)
    ctx.lineTo(bodyWidth/4, bodyLength/2 - 6)
    ctx.lineTo(bodyWidth/2.2, bodyLength/2)
    ctx.quadraticCurveTo(0, bodyLength/2 + 2, -bodyWidth/2.2, bodyLength/2)
    ctx.fill()

    // DRS flap
    ctx.fillStyle = this.colors.carbon
    ctx.beginPath()
    ctx.moveTo(-bodyWidth/2.4, bodyLength/2 - 10)
    ctx.lineTo(-bodyWidth/4, bodyLength/2 - 14)
    ctx.lineTo(bodyWidth/4, bodyLength/2 - 14)
    ctx.lineTo(bodyWidth/2.4, bodyLength/2 - 10)
    ctx.fill()

    // Cockpit and halo (from top view)
    ctx.fillStyle = this.colors.carbon
    ctx.beginPath()
    ctx.ellipse(0, -bodyLength/8, bodyWidth/7, bodyLength/7, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  private drawWheels(ctx: CanvasRenderingContext2D, steeringAngle: number): void {
    const wheelPositions = [
      { x: -this.TRACK_WIDTH/2, y: -this.WHEELBASE/2, isFront: true },
      { x: this.TRACK_WIDTH/2, y: -this.WHEELBASE/2, isFront: true },
      { x: -this.TRACK_WIDTH/2, y: this.WHEELBASE/2, isFront: false },
      { x: this.TRACK_WIDTH/2, y: this.WHEELBASE/2, isFront: false }
    ]

    wheelPositions.forEach(pos => {
      this.drawWheel(ctx, pos.x, pos.y, pos.isFront ? steeringAngle : 0)
    })
  }

  private drawWheel(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number = 0): void {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)

    // Draw tire as rounded rectangle (contact patch view)
    ctx.fillStyle = this.colors.wheels
    this.drawRoundedRect(
      ctx,
      -this.WHEEL_WIDTH/2,
      -this.WHEEL_LENGTH/2,
      this.WHEEL_WIDTH,
      this.WHEEL_LENGTH,
      3  // Corner radius
    )

    // Simple line to show direction
    ctx.strokeStyle = '#666'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(0, -this.WHEEL_LENGTH/3)
    ctx.lineTo(0, this.WHEEL_LENGTH/3)
    ctx.stroke()

    ctx.restore()
  }

  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.arcTo(x + width, y, x + width, y + radius, radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius)
    ctx.lineTo(x + radius, y + height)
    ctx.arcTo(x, y + height, x, y + height - radius, radius)
    ctx.lineTo(x, y + radius)
    ctx.arcTo(x, y, x + radius, y, radius)
    ctx.closePath()
    ctx.fill()
  }
}
