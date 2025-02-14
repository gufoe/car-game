import { VisualEffects } from './VisualEffects'
import type { MapEntityEffect } from './entities/MapEntity'
import { RectShapeImpl } from './shapes/Shape'
import type { Position, Controls } from './types'
import { CarDrawer } from './CarDrawer'
import { WheelTraces } from './WheelTraces'
import { CarWheel } from './CarWheel'

export interface CarStats {
  maxSpeed: number
  acceleration: number
  handling: number
}

export class Car {
  private worldPosition: Position   // Position in world coordinates
  private rearAxlePos: Position     // Position of the rear axle
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

  // Updated physics constants
  private readonly maxSpeed: number
  private readonly steeringSpeed = Math.PI / 32
  private readonly maxSteeringAngle = Math.PI / 4
  private readonly airResistance = 0.99    // Air drag coefficient

  // Dynamic state variables
  private readonly drawer: CarDrawer
  private activeEffects: MapEntityEffect[] = []

  private crashed: boolean = false
  private shape: RectShapeImpl
  private onScoreUpdate?: (points: number) => void

  private wheels: CarWheel[] = []
  private angularVelocity: number = 0;

  constructor(private stats: CarStats, onScoreUpdate?: (points: number) => void) {
    // Start at the bottom center of the screen in world coordinates
    this.worldPosition = { x: 0, y: 0 };
    // Initialize rearAxlePos based on the car's orientation and wheelbase
    const centerToAxle = this.wheelbase / 2; // distance from center to rear axle
    this.rearAxlePos = {
      x: this.worldPosition.x - Math.sin(this.rotation) * centerToAxle,
      y: this.worldPosition.y + Math.cos(this.rotation) * centerToAxle
    };
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

    // Example: define four wheels at local positions relative to car center
    // (x=±trackWidth/2, y=±wheelbase/2).
    const halfTrack = this.trackWidth / 2
    const halfBase = this.wheelbase / 2
    const wheelMass = 10     // Example, tune as needed
    const wheelInertia = 1.0 // Example, tune as needed
    this.wheels = [
      new CarWheel({ x: -halfTrack, y: -halfBase }, true,  wheelMass, wheelInertia), // front-left
      new CarWheel({ x:  halfTrack, y: -halfBase }, true,  wheelMass, wheelInertia), // front-right
      new CarWheel({ x: -halfTrack, y:  halfBase }, false, wheelMass, wheelInertia), // rear-left
      new CarWheel({ x:  halfTrack, y:  halfBase }, false, wheelMass, wheelInertia), // rear-right
    ]
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
    this.updatePosition(deltaTime)

    // Add trace points for each wheel
    const speed = Math.abs(this.velocity)
    const drift = Math.abs(this.lateralVelocity)

    // Calculate different intensities for front and rear wheels
    const baseIntensity = Math.min((speed + drift) / this.maxSpeed, 1)
    const accelerating = controls.up || controls.down
    const rearWheelIntensity = baseIntensity * (accelerating ? 1.5 : 1.0) // More intense when accelerating
    const frontWheelIntensity = baseIntensity * 0.7 // Less intense for front wheels

    if (speed > 0.1 || drift > 0.1) {
      // Get wheel positions in car's local space
      const halfTrack = this.trackWidth / 2
      const halfBase = this.wheelbase / 2
      const localWheels = {
        frontLeft: { x: -halfTrack, y: -halfBase },
        frontRight: { x: halfTrack, y: -halfBase },
        rearLeft: { x: -halfTrack, y: halfBase },
        rearRight: { x: halfTrack, y: halfBase }
      }

      // Transform each wheel position to world space
      const cos = Math.cos(this.rotation)
      const sin = Math.sin(this.rotation)
      Object.entries(localWheels).forEach(([wheel, pos]) => {
        // First rotate by car's rotation
        const rotatedX = pos.x * cos - pos.y * sin
        const rotatedY = pos.x * sin + pos.y * cos

        // Store in world coordinates with wheel-specific intensity
        const isRearWheel = wheel.startsWith('rear')
        const intensity = isRearWheel ? rearWheelIntensity : frontWheelIntensity
        this.traces.addTracePoint(wheel, {
          x: this.worldPosition.x + rotatedX,
          y: this.worldPosition.y + rotatedY
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
    const normalizedDelta = deltaTime / 16
    const baseAcceleration = this.stats.acceleration

    // Apply acceleration with more realistic curve
    if (controls.up) {
      const accelerationCurve = 1 - (this.velocity / effectiveMaxSpeed) * 0.8
      this.velocity = Math.min(
        this.velocity + baseAcceleration * accelerationCurve * normalizedDelta,
        effectiveMaxSpeed
      )
    } else if (controls.down) {
      this.velocity = Math.max(
        this.velocity - baseAcceleration * 0.7 * normalizedDelta,
        -effectiveMaxSpeed * 0.5
      )
    }

    // Apply air resistance and tire friction
    this.velocity *= Math.pow(this.airResistance, normalizedDelta)
    if (Math.abs(this.velocity) < 0.1) this.velocity = 0
  }

  private updatePhysics(deltaTime: number): void {
    if (Math.abs(this.velocity) < 0.1) return;
    const dt = deltaTime / 1000;

    // Update wheels: front wheels steer and rear wheels provide drive traction (drive force already handled in updateVelocity).
    this.wheels.forEach(w => {
      const steering = w.isFrontWheel ? this.steeringAngle : 0;
      w.updateWheel(
        { x: Math.sin(this.rotation) * this.velocity, y: -Math.cos(this.rotation) * this.velocity },
        this.angularVelocity,
        this.rotation,
        steering,
        dt,
        w.isFrontWheel ? 0 : 0
      );
    });

    // Removed the bicycle model integration from here; updatePosition now handles the state update including rotation.
  }

  private updatePosition(deltaTime: number): void {
    // Tuning Constants for updatePosition
    const dtFactor = 1 / 50; // Converts deltaTime to seconds; adjust this factor to speed up or slow down simulation time
    const dt = deltaTime * dtFactor; // Delta time in seconds

    const wheelbase = this.wheelbase;            // Car's wheelbase (distance between front and rear axles)
    const halfWheelbase = wheelbase / 2;           // Distance from car's center to rear axle

    // Grip-related tuning constants
    const BASE_GRIP_G = 10;  // Grip constant at low speeds (higher value means more grip when slow)
    const MIN_GRIP_G = 1;    // Grip constant at high speeds (lower value means less grip when fast)
    // SPEED_THRESHOLD: speed above which additional front wheel slip occurs
    const SPEED_THRESHOLD = 0.5 * this.stats.maxSpeed;
    // MAX_EXCESS_SPEED: maximum speed range above the threshold used in slip calculations
    const MAX_EXCESS_SPEED = 0.1 * this.stats.maxSpeed;
    const FRONT_WHEEL_SLIP_MULTIPLIER = 0.5; // Maximum reduction factor (up to 30% reduction in effective steering) due to front wheel slip at high speeds

    // Turning deceleration constant
    const TURN_DECEL_MULTIPLIER = 2; // Multiplier for turning deceleration (simulate traction loss during turns)

    // Begin physics calculations
    const rawTan = Math.tan(this.steeringAngle);
    const lateralAcceleration = Math.abs((this.velocity * this.velocity * rawTan) / wheelbase);

    // Compute dynamic grip limit based on current speed
    const speedFactor = Math.min(Math.abs(this.velocity) / this.stats.maxSpeed, 1);
    const effectiveG = BASE_GRIP_G - (BASE_GRIP_G - MIN_GRIP_G) * speedFactor;
    const gripLimit = this.stats.handling * effectiveG;

    // Scale down steering (tan) value if lateral acceleration exceeds grip limit
    const scale = lateralAcceleration > gripLimit ? gripLimit / lateralAcceleration : 1;
    let effectiveTan = rawTan * scale;

    // Apply additional reduction due to front wheel slip at high speeds
    if (Math.abs(this.velocity) > SPEED_THRESHOLD) {
      const excessSpeed = Math.abs(this.velocity) - SPEED_THRESHOLD;
      const slipRatio = excessSpeed / MAX_EXCESS_SPEED; // Ranges from 0 to 1
      const reductionFactor = 1 - FRONT_WHEEL_SLIP_MULTIPLIER * slipRatio; // Up to 30% reduction at maximum excess speed
      effectiveTan *= reductionFactor;
    }

    // Compute effective slip angle beta using the bicycle model
    const beta = Math.atan((halfWheelbase / wheelbase) * effectiveTan);

    // Update car center position using effective slip angle
    this.worldPosition.x += this.velocity * dt * Math.sin(this.rotation + beta);
    this.worldPosition.y += this.velocity * dt * -Math.cos(this.rotation + beta);

    // Update orientation
    const dtheta = (this.velocity / wheelbase) * Math.cos(beta) * effectiveTan * dt;
    this.rotation += dtheta;
    this.angularVelocity = dtheta / dt;

    // Update rear axle position based on new center and orientation
    this.rearAxlePos.x = this.worldPosition.x - halfWheelbase * Math.sin(this.rotation);
    this.rearAxlePos.y = this.worldPosition.y + halfWheelbase * Math.cos(this.rotation);

    // Update collision shape to match new position and orientation
    this.shape = new RectShapeImpl(this.worldPosition.x, this.worldPosition.y, this.width, this.height, this.rotation);

    // Apply turning deceleration to simulate traction loss during turns
    const turnDeceleration = Math.abs(effectiveTan) * TURN_DECEL_MULTIPLIER;
    if (this.velocity > 0) {
      this.velocity = Math.max(this.velocity - turnDeceleration * dt, 0);
    } else if (this.velocity < 0) {
      this.velocity = Math.min(this.velocity + turnDeceleration * dt, 0);
    }
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
      this.updatePosition(0)
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
