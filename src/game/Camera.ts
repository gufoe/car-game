import type { Position } from './types'

export class Camera {
  private position: Position = { x: 0, y: 0 }
  private targetPosition: Position = { x: 0, y: 0 }
  private smoothFactor = 0.1 // Adjust this to control camera smoothness (0-1)
  private screenCenter: Position

  constructor(screenWidth: number, screenHeight: number) {
    this.screenCenter = {
      x: screenWidth / 2,
      y: screenHeight * 0.8
    }
    this.position = { ...this.screenCenter }
    this.targetPosition = { ...this.screenCenter }
  }

  update(targetWorldPos: Position): void {
    // Simply follow the car's Y position like in the original code
    this.targetPosition = {
      x: this.screenCenter.x,
      y: this.screenCenter.y - targetWorldPos.y
    }

    // Smoothly interpolate current position to target position
    this.position.x += (this.targetPosition.x - this.position.x) * this.smoothFactor
    this.position.y += (this.targetPosition.y - this.position.y) * this.smoothFactor
  }

  applyTransform(ctx: CanvasRenderingContext2D): void {
    ctx.translate(this.position.x, this.position.y)
  }

  // For screen resizing
  updateScreenSize(width: number, height: number): void {
    this.screenCenter = {
      x: width / 2,
      y: height * 0.8
    }
  }
}
