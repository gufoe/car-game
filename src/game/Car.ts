import type { Position, Controls } from './types'
import { CarDrawer } from './CarDrawer'
import { WheelTraces } from './WheelTraces'
import { VisualEffects } from './VisualEffects'

export class Car {
  private worldPosition: Position   // Position in world coordinates
  private readonly width = 50
  private readonly height = 90
  private rotation = 0             // Angle in radians, 0 means pointing up
  private velocity = 0             // Current speed
  private lateralVelocity = 0      // Sideways velocity for drift
  private steeringAngle = 0        // Front wheel angle
  private readonly wheelbase = 60   // Distance between front and rear axles
  private readonly trackWidth = 40  // Distance between left and right wheels
  private readonly traces: WheelTraces
  private readonly effects: VisualEffects

  // Physics constants
  private readonly maxSpeed = 10
  private readonly maxReverseSpeed = 5
  private readonly acceleration = 0.2
  private readonly deceleration = 0.1
  private readonly steeringSpeed = Math.PI / 32
  private readonly maxSteeringAngle = Math.PI / 4
  private readonly turnResponse = 2.0      // How quickly the car responds to steering
  private readonly gripFactor = 0.95       // How much grip the car has (0-1)
  private readonly driftFactor = 0.7       // How much the car drifts (0-1)
  private readonly weightTransfer = 0.02   // Effect of weight transfer during turns
  private readonly tireFriction = 0.9      // Increased base friction
  private readonly corneringStiffness = 0.8  // Increased for better grip
  private readonly reverseSteerFactor = 1.2
  private readonly inertiaFactor = 0.95    // Slightly reduced for better control
  private readonly lateralDampening = 0.92 // New: controls how quickly lateral forces diminish

  // Dynamic state variables
  private weightDistribution = 0.5
  private slipAngle = 0

  private readonly drawer: CarDrawer

  constructor(screenWidth: number, screenHeight: number) {
    // Start at the bottom center of the screen in world coordinates
    this.worldPosition = {
      x: 0,
      y: 0
    }
    this.drawer = new CarDrawer()
    this.traces = new WheelTraces()
    this.effects = new VisualEffects()
  }

  private getWheelPositions(): { [key: string]: Position } {
    const halfTrack = this.trackWidth / 2
    const halfBase = this.wheelbase / 2

    // Calculate wheel positions relative to car center
    const frontLeft = {
      x: -halfTrack,
      y: -halfBase
    }
    const frontRight = {
      x: halfTrack,
      y: -halfBase
    }
    const rearLeft = {
      x: -halfTrack,
      y: halfBase
    }
    const rearRight = {
      x: halfTrack,
      y: halfBase
    }

    // Rotate front wheels based on steering angle
    if (this.steeringAngle !== 0) {
      const cos = Math.cos(this.steeringAngle)
      const sin = Math.sin(this.steeringAngle)

      // Rotate front wheels
      const frontLeftX = frontLeft.x
      frontLeft.x = frontLeftX * cos - frontLeft.y * sin
      frontLeft.y = frontLeftX * sin + frontLeft.y * cos

      const frontRightX = frontRight.x
      frontRight.x = frontRightX * cos - frontRight.y * sin
      frontRight.y = frontRightX * sin + frontRight.y * cos
    }

    // Transform to world coordinates
    const cos = Math.cos(this.rotation)
    const sin = Math.sin(this.rotation)

    return {
      frontLeft: {
        x: this.worldPosition.x + (frontLeft.x * cos - frontLeft.y * sin),
        y: this.worldPosition.y + (frontLeft.x * sin + frontLeft.y * cos)
      },
      frontRight: {
        x: this.worldPosition.x + (frontRight.x * cos - frontRight.y * sin),
        y: this.worldPosition.y + (frontRight.x * sin + frontRight.y * cos)
      },
      rearLeft: {
        x: this.worldPosition.x + (rearLeft.x * cos - rearLeft.y * sin),
        y: this.worldPosition.y + (rearLeft.x * sin + rearLeft.y * cos)
      },
      rearRight: {
        x: this.worldPosition.x + (rearRight.x * cos - rearRight.y * sin),
        y: this.worldPosition.y + (rearRight.x * sin + rearRight.y * cos)
      }
    }
  }

  public update(controls: Controls): void {
    this.updateSteering(controls)
    this.updateVelocity(controls)
    this.updatePhysics()
    this.updatePosition()

    // Add trace points for each wheel
    const wheelPositions = this.getWheelPositions()
    const speed = Math.abs(this.velocity)
    const drift = Math.abs(this.lateralVelocity)
    const intensity = Math.min((speed + drift) / this.maxSpeed, 1)

    if (speed > 0.1 || drift > 0.1) {
      Object.entries(wheelPositions).forEach(([wheel, pos]) => {
        this.traces.addTracePoint(wheel, pos, intensity)
      })
    }

    // Update traces (fade out)
    this.traces.update()

    // Update visual effects
    const isDrifting = Math.abs(this.lateralVelocity) > 0.5
    this.effects.update(speed, isDrifting, this.worldPosition, this.rotation)
  }

  private updateSteering(controls: Controls): void {
    // Update steering angle with gradual return to center
    if (controls.left) {
      this.steeringAngle = Math.max(-this.maxSteeringAngle, this.steeringAngle - this.steeringSpeed)
    } else if (controls.right) {
      this.steeringAngle = Math.min(this.maxSteeringAngle, this.steeringAngle + this.steeringSpeed)
    } else {
      // Return wheels to center when not steering
      if (Math.abs(this.steeringAngle) < this.steeringSpeed) {
        this.steeringAngle = 0
      } else {
        this.steeringAngle -= Math.sign(this.steeringAngle) * this.steeringSpeed
      }
    }
  }

  private updateVelocity(controls: Controls): void {
    // Update forward velocity with acceleration and deceleration
    if (controls.up) {
      this.velocity = Math.min(this.velocity + this.acceleration, this.maxSpeed)
    } else if (controls.down) {
      this.velocity = Math.max(this.velocity - this.acceleration, -this.maxSpeed / 2)
    } else {
      // Natural deceleration
      if (Math.abs(this.velocity) < this.deceleration) {
        this.velocity = 0
      } else {
        this.velocity -= Math.sign(this.velocity) * this.deceleration
      }
    }
  }

  private updatePhysics(): void {
    if (Math.abs(this.velocity) < 0.1) return  // Skip physics at very low speeds

    const isReversing = this.velocity < 0
    const speedFactor = Math.min(Math.abs(this.velocity) / (isReversing ? this.maxReverseSpeed : this.maxSpeed), 1)

    // Calculate effective steering angle
    const effectiveSteeringAngle = this.steeringAngle * (isReversing ? -this.reverseSteerFactor : 1)

    // Calculate turn radius based on steering angle and wheelbase
    // Ackermann steering geometry (simplified)
    const turnRadius = this.wheelbase / Math.sin(Math.abs(this.steeringAngle) + 0.001)

    // Calculate ideal turning rate based on velocity and turn radius
    const idealTurnRate = (this.velocity / turnRadius) * Math.sign(this.steeringAngle)

    // Calculate actual turn rate with grip and drift factors
    const gripMultiplier = this.gripFactor * (1 - speedFactor * (1 - this.driftFactor))

    // Apply weight transfer effect
    const weightTransferEffect = this.weightTransfer * speedFactor * Math.abs(this.steeringAngle)
    const effectiveTurnRate = idealTurnRate * gripMultiplier * (1 - weightTransferEffect)

    // Update rotation
    this.rotation += effectiveTurnRate

    // Calculate and update lateral velocity (drift)
    const turnForce = Math.abs(this.velocity * this.steeringAngle) * (1 - gripMultiplier)
    this.lateralVelocity = turnForce * Math.sign(this.steeringAngle) * this.driftFactor

    // Decay lateral velocity
    this.lateralVelocity *= 0.95
  }

  private updatePosition(): void {
    // Update position based on forward velocity and rotation
    const forwardX = Math.sin(this.rotation) * this.velocity
    const forwardY = -Math.cos(this.rotation) * this.velocity

    // Add lateral velocity contribution (drift)
    const lateralX = Math.cos(this.rotation) * this.lateralVelocity
    const lateralY = Math.sin(this.rotation) * this.lateralVelocity

    // Combine movements
    this.worldPosition.x += forwardX + lateralX
    this.worldPosition.y += forwardY + lateralY
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    const screenX = ctx.canvas.width / 2
    const screenY = ctx.canvas.height * 0.8

    ctx.save()

    // Draw visual effects first (behind everything)
    this.effects.draw(ctx, this.worldPosition, this.rotation)

    // Move to car's screen position (including world offset)
    ctx.translate(screenX + this.worldPosition.x, screenY)

    // Draw traces relative to car's position
    this.traces.draw(ctx, this.worldPosition)

    // Draw car (only need rotation since we're already at the right position)
    ctx.rotate(this.rotation)
    this.drawer.drawCar(ctx, this.width, this.height, this.steeringAngle)
    ctx.restore()
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

  public clearTraces(): void {
    this.traces.clear()
  }
}
