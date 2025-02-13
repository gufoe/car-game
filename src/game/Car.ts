import { VisualEffects } from './VisualEffects'
import type { MapEntityEffect } from './entities/MapEntity'
import { RectShape } from './shapes/Shape'
import type { Position, Controls } from './types'
import { CarDrawer } from './CarDrawer'
import { WheelTraces } from './WheelTraces'

export interface CarStats {
  maxSpeed: number
  acceleration: number
  handling: number
}

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

  private activeEffects: MapEntityEffect[] = []

  private crashed: boolean = false
  private shape: RectShape

  constructor(screenWidth: number, screenHeight: number, private stats: CarStats) {
    // Start at the bottom center of the screen in world coordinates
    this.worldPosition = {
      x: 0,
      y: 0
    }
    this.drawer = new CarDrawer()
    this.traces = new WheelTraces()
    this.effects = new VisualEffects()
    this.shape = new RectShape(this.worldPosition.x, this.worldPosition.y, this.width, this.height)
  }

  private getWheelPositions(): { [key: string]: Position } {
    const halfTrack = this.trackWidth / 2
    const halfBase = this.wheelbase / 2

    // Calculate wheel positions relative to car center, matching CarDrawer dimensions
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

      // Rotate front wheels around their own axis
      const rotateWheel = (wheel: Position) => {
        const x = wheel.x
        const y = wheel.y
        return {
          x: x * cos - y * sin,
          y: x * sin + y * cos
        }
      }

      const rotatedFrontLeft = rotateWheel(frontLeft)
      frontLeft.x = rotatedFrontLeft.x
      frontLeft.y = rotatedFrontLeft.y

      const rotatedFrontRight = rotateWheel(frontRight)
      frontRight.x = rotatedFrontRight.x
      frontRight.y = rotatedFrontRight.y
    }

    // Transform to car's local rotated space
    const cos = Math.cos(this.rotation)
    const sin = Math.sin(this.rotation)

    const transformToLocal = (pos: Position): Position => ({
      x: pos.x * cos - pos.y * sin,
      y: pos.x * sin + pos.y * cos
    })

    return {
      frontLeft: transformToLocal(frontLeft),
      frontRight: transformToLocal(frontRight),
      rearLeft: transformToLocal(rearLeft),
      rearRight: transformToLocal(rearRight)
    }
  }

  public update(controls: Controls): void {
    if (this.crashed) return

    // Update active effects and remove expired ones
    const now = performance.now()
    this.activeEffects = this.activeEffects.filter(effect => {
      if (!effect.startTime) return false
      return now - effect.startTime < effect.duration
    })

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
        // Add wheel traces in world space
        this.traces.addTracePoint(wheel, {
          x: this.worldPosition.x + pos.x,
          y: this.worldPosition.y + pos.y
        }, intensity)
      })
    }

    // Update traces (fade out)
    this.traces.update()

    // Update visual effects
    this.effects.update(speed, this.worldPosition, this.rotation)

    // Update shape position to match car position
    this.shape.setPosition(this.worldPosition.x, this.worldPosition.y)
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
    const effectiveMaxSpeed = this.getEffectiveMaxSpeed()

    if (controls.up) {
      this.velocity = Math.min(this.velocity + this.acceleration, effectiveMaxSpeed)
    } else if (controls.down) {
      this.velocity = Math.max(this.velocity - this.acceleration, -effectiveMaxSpeed * 0.5)
    } else {
      // Apply drag when no acceleration input
      if (this.velocity > 0) {
        this.velocity = Math.max(0, this.velocity - this.acceleration * 0.5)
      } else if (this.velocity < 0) {
        this.velocity = Math.min(0, this.velocity + this.acceleration * 0.5)
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
    // Update position based on velocity and rotation
    this.worldPosition.x += Math.sin(this.rotation) * this.velocity + Math.cos(this.rotation) * this.lateralVelocity
    this.worldPosition.y -= Math.cos(this.rotation) * this.velocity - Math.sin(this.rotation) * this.lateralVelocity

    // Calculate corners of the rotated rectangle
    const halfWidth = this.width / 2
    const halfHeight = this.height / 2
    const cos = Math.cos(this.rotation)
    const sin = Math.sin(this.rotation)

    const corners = [
      { // Top left (front left since car points up)
        x: this.worldPosition.x - halfWidth * cos + halfHeight * sin,
        y: this.worldPosition.y - halfWidth * sin - halfHeight * cos
      },
      { // Top right (front right)
        x: this.worldPosition.x + halfWidth * cos + halfHeight * sin,
        y: this.worldPosition.y + halfWidth * sin - halfHeight * cos
      },
      { // Bottom right (rear right)
        x: this.worldPosition.x + halfWidth * cos - halfHeight * sin,
        y: this.worldPosition.y + halfWidth * sin + halfHeight * cos
      },
      { // Bottom left (rear left)
        x: this.worldPosition.x - halfWidth * cos - halfHeight * sin,
        y: this.worldPosition.y - halfWidth * sin + halfHeight * cos
      }
    ]

    // Create a new shape with the actual rotated rectangle
    this.shape = new RectShape(
      this.worldPosition.x,
      this.worldPosition.y,
      this.width,
      this.height,
      this.rotation,
      corners
    )
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save()

    // Draw visual effects first (behind everything)
    this.effects.draw(ctx, this.worldPosition)

    // Draw traces relative to car's position
    this.traces.draw(ctx, this.worldPosition)

    // Move to car's position and rotate
    ctx.translate(this.worldPosition.x, this.worldPosition.y)
    ctx.rotate(this.rotation)
    this.drawer.drawCar(ctx, this.width, this.height, this.steeringAngle)
    ctx.restore()
  }

  public debugDraw(ctx: CanvasRenderingContext2D, isDebugMode: boolean): void {
    if (!isDebugMode) return

    ctx.save()
    // Draw the collision shape (already in world coordinates)
    this.shape.debugDraw(ctx)

    // Draw the car's center point
    ctx.fillStyle = '#00ff00'
    ctx.beginPath()
    ctx.arc(this.worldPosition.x, this.worldPosition.y, 3, 0, Math.PI * 2)
    ctx.fill()

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

  public applyEffect(effect: MapEntityEffect): void {
    effect.startTime = performance.now()
    this.activeEffects.push(effect)
  }

  public getActiveEffects(): MapEntityEffect[] {
    return this.activeEffects
  }

  private getEffectiveMaxSpeed(): number {
    let maxSpeedMultiplier = 1
    const now = performance.now()

    this.activeEffects.forEach(effect => {
      if (effect.type === 'maxSpeed' && effect.startTime && now - effect.startTime < effect.duration) {
        maxSpeedMultiplier *= effect.value
      }
    })

    return this.maxSpeed * maxSpeedMultiplier
  }

  public crash(): void {
    this.crashed = true
  }

  public isCrashed(): boolean {
    return this.crashed
  }

  public getShape(): RectShape {
    return this.shape
  }
}
