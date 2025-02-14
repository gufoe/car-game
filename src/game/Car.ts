import { VisualEffects } from './VisualEffects'
import type { MapEntityEffect } from './entities/MapEntity'
import { RectShapeImpl } from './shapes/Shape'
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
  private readonly baseWidth = 50
  private readonly baseHeight = 90
  private width = this.baseWidth
  private height = this.baseHeight
  private rotation = 0             // Angle in radians, 0 means pointing up
  private velocity = 0             // Current speed
  private lateralVelocity = 0      // Sideways velocity for drift
  private steeringAngle = 0        // Front wheel angle
  private readonly wheelbase = 60   // Distance between front and rear axles
  private readonly trackWidth = 40  // Distance between left and right wheels
  private readonly traces: WheelTraces
  private readonly effects: VisualEffects

  // Physics constants
  private readonly maxSpeed: number
  private readonly maxReverseSpeed: number
  private readonly steeringSpeed = Math.PI / 32
  private readonly maxSteeringAngle = Math.PI / 4
  private readonly gripFactor = 0.95       // How much grip the car has (0-1)
  private readonly driftFactor = 0.7       // How much the car drifts (0-1)
  private readonly weightTransfer = 0.02   // Effect of weight transfer during turns

  // Dynamic state variables
  private readonly drawer: CarDrawer
  private activeEffects: MapEntityEffect[] = []

  private crashed: boolean = false
  private shape: RectShapeImpl
  private onScoreUpdate?: (points: number) => void

  constructor(private stats: CarStats, onScoreUpdate?: (points: number) => void) {
    // Start at the bottom center of the screen in world coordinates
    this.worldPosition = {
      x: 0,
      y: 0
    }
    this.drawer = new CarDrawer()
    this.traces = new WheelTraces()
    this.effects = new VisualEffects()

    // Reset dimensions to base values
    this.width = this.baseWidth
    this.height = this.baseHeight

    // Reset shape with initial dimensions
    this.shape = new RectShapeImpl(this.worldPosition.x, this.worldPosition.y, this.width, this.height)
    this.onScoreUpdate = onScoreUpdate

    // Reset all physics values
    this.velocity = 0
    this.lateralVelocity = 0
    this.steeringAngle = 0
    this.rotation = 0
    this.crashed = false

    // Clear any active effects
    this.activeEffects = []

    // Initialize physics constants from stats
    this.maxSpeed = stats.maxSpeed
    this.maxReverseSpeed = stats.maxSpeed * 0.5
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

  public update(controls: Controls, deltaTime: number = 16): void {
    if (this.crashed) return

    // Update active effects and remove expired ones
    const now = performance.now()
    this.activeEffects = this.activeEffects.filter(effect => {
      if (!effect.startTime) return false
      // Keep permanent effects (duration: 0) but filter out expired timed effects
      return effect.duration === 0 || now - effect.startTime < effect.duration
    })

    this.updateSteering(controls)
    this.updateVelocity(controls, deltaTime)
    this.updatePhysics(deltaTime)
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

  private updateVelocity(controls: Controls, deltaTime: number): void {
    const effectiveMaxSpeed = this.getEffectiveMaxSpeed()
    const normalizedDelta = deltaTime / 16 // Normalize to 60fps
    const baseAcceleration = this.stats.acceleration // Use base acceleration from stats

    if (controls.up) {
      this.velocity = Math.min(this.velocity + baseAcceleration * normalizedDelta, effectiveMaxSpeed)
    } else if (controls.down) {
      this.velocity = Math.max(this.velocity - baseAcceleration * normalizedDelta, -effectiveMaxSpeed * 0.5)
    } else {
      // Apply drag when no acceleration input
      if (this.velocity > 0) {
        this.velocity = Math.max(0, this.velocity - baseAcceleration * 0.5 * normalizedDelta)
      } else if (this.velocity < 0) {
        this.velocity = Math.min(0, this.velocity + baseAcceleration * 0.5 * normalizedDelta)
      }
    }
  }

  private updatePhysics(deltaTime: number): void {
    if (Math.abs(this.velocity) < 0.1) return  // Skip physics at very low speeds

    const normalizedDelta = deltaTime / 16 // Normalize to 60fps
    const isReversing = this.velocity < 0
    const speedFactor = Math.min(Math.abs(this.velocity) / (isReversing ? this.maxReverseSpeed : this.maxSpeed), 1)

    // Calculate turn radius based on steering angle and wheelbase
    // Ackermann steering geometry (simplified)
    const turnRadius = this.wheelbase / Math.sin(Math.abs(this.steeringAngle) + 0.001)

    // Calculate ideal turning rate based on velocity and turn radius
    const idealTurnRate = (this.velocity / turnRadius) * Math.sign(this.steeringAngle)

    // Calculate actual turn rate with grip and drift factors
    const gripMultiplier = this.gripFactor * (1 - speedFactor * (1 - this.driftFactor))

    // Apply weight transfer effect
    const weightTransferEffect = this.weightTransfer * speedFactor * Math.abs(this.steeringAngle)
    const effectiveTurnRate = idealTurnRate * gripMultiplier * (1 - weightTransferEffect) * normalizedDelta

    // Update rotation
    this.rotation += effectiveTurnRate

    // Calculate and update lateral velocity (drift)
    const turnForce = Math.abs(this.velocity * this.steeringAngle) * (1 - gripMultiplier)
    this.lateralVelocity = turnForce * Math.sign(this.steeringAngle) * this.driftFactor

    // Decay lateral velocity
    this.lateralVelocity *= Math.pow(0.95, normalizedDelta)
  }

  private updatePosition(): void {
    // Update position based on velocity and rotation
    this.worldPosition.x += Math.sin(this.rotation) * this.velocity + Math.cos(this.rotation) * this.lateralVelocity
    this.worldPosition.y -= Math.cos(this.rotation) * this.velocity - Math.sin(this.rotation) * this.lateralVelocity

    // Create a new shape with the actual rotated rectangle
    this.shape = new RectShapeImpl(
      this.worldPosition.x,
      this.worldPosition.y,
      this.width,
      this.height,
      this.rotation
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

    // Handle instant score effects
    if (effect.type === 'score' && this.onScoreUpdate) {
      this.onScoreUpdate(effect.value)
    }
    // Handle instant size effects
    else if (effect.type === 'size') {
      // Increase height (length) of the car
      this.height = this.baseHeight + effect.value
      // Update shape with new dimensions
      this.updatePosition()
    }
  }

  public getActiveEffects(): MapEntityEffect[] {
    return this.activeEffects
  }

  private getEffectiveMaxSpeed(): number {
    let maxSpeedMultiplier = 1
    const now = performance.now()

    // Only consider active, non-expired effects
    this.activeEffects = this.activeEffects.filter(effect => {
      if (!effect.startTime) return false
      return effect.duration === 0 || now - effect.startTime < effect.duration
    })

    // Get the highest active speed boost effect
    this.activeEffects.forEach(effect => {
      if (effect.type === 'maxSpeed' && effect.startTime) {
        // Only apply temporary speed effects, ignore permanent ones
        if (effect.duration > 0 && now - effect.startTime < effect.duration) {
          maxSpeedMultiplier = Math.max(maxSpeedMultiplier, effect.value)
        }
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

  public getShape(): RectShapeImpl {
    return this.shape
  }
}
