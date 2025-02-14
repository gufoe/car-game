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

        // Example: define four wheels at local positions relative to car center
        // (x=±trackWidth/2, y=±wheelbase/2).
        const halfTrack = this.trackWidth / 2
        const halfBase = this.wheelbase / 2
        const wheelMass = 10     // Example, tune as needed
        const wheelInertia = 1.0 // Example, tune as needed
        this.wheels = [
            new CarWheel({ x: -halfTrack, y: -halfBase }, true, wheelMass, wheelInertia), // front-left
            new CarWheel({ x: halfTrack, y: -halfBase }, true, wheelMass, wheelInertia), // front-right
            new CarWheel({ x: -halfTrack, y: halfBase }, false, wheelMass, wheelInertia), // rear-left
            new CarWheel({ x: halfTrack, y: halfBase }, false, wheelMass, wheelInertia), // rear-right
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
        this.updatePosition()

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
        if (Math.abs(this.velocity) < 0.1) return


        // Improved steering physics
        const turnRadius = this.wheelbase / Math.sin(Math.abs(this.steeringAngle) + 0.001)

        // Realistic grip calculation

        // STEP 1: For demonstration, let's say we compute driveForce for rear wheels
        // based on user's throttle. If controls.up, produce some positive force; if down, negative:
        let driveForce = 0
        // For example:
        // driveForce = someAcceleration * massOfCar * (controls.up ? 1 : (controls.down ? -1 : 0))

        // STEP 2: Update each wheel's forces
        // Combine the car's velocity into {x, y}, and an angular velocity (currently not tracked in your code).
        // For a simpler approach, we approximate angularVelocity from your rotation changes:
        const carAngularVel = this.angularVelocity
        const dt = deltaTime / 1000 // convert ms to seconds if you track it that way

        this.wheels.forEach(w => {
            // If it's a front wheel, set w.steeringAngle = this.steeringAngle
            // Rear wheels get no steeringAngle
            w.updateWheel(
                { x: Math.sin(this.rotation) * this.velocity, y: -Math.cos(this.rotation) * this.velocity },
                carAngularVel,
                this.rotation,
                w.isFrontWheel ? this.steeringAngle : 0,
                dt,
                w.isFrontWheel ? 0 : driveForce // drive force only on rear wheels for RWD
            )
        })

        // STEP 3: Sum up forces from wheels:
        let totalTorque = 0
        this.wheels.forEach(w => {
            // If you store fx, fy in each wheel, sum them up here. We used an example getTorque():
            totalTorque += w.getTorque()
        })

        // Use PD control to drive the angular velocity towards the desired turn rate
        const turnMultiplier = 20; // increased multiplier to amplify desired turn rate
        const desiredAngularVelocity = (Math.abs(this.steeringAngle) > 0.01) ? (this.velocity / turnRadius) * Math.sign(this.steeringAngle) * turnMultiplier : 0;
        const gain = 20; // increased gain factor for responsiveness
        this.angularVelocity += (desiredAngularVelocity - this.angularVelocity) * gain * dt;

        // Update rotation from angular velocity
        this.rotation += this.angularVelocity * dt;

        // STEP 4: Integrate motion for the car body.
        // For instance:
        // carAx = totalFx / carMass
        // carAy = totalFy / carMass
        // this.velocity.x += carAx * dt  (but your code currently uses a scalar 'velocity')
        // ...
        // rotation += (totalTorque / carInertia) * dt

        // ) Keep or remove parts of your old drift code as you see fit. The wheel-based approach
        //   typically replaces that logic, because each wheel is generating real lateral forces.
    }

    private updatePosition(): void {
        // Improved position update with more accurate drift
        const forwardX = Math.sin(this.rotation) * this.velocity
        const forwardY = -Math.cos(this.rotation) * this.velocity

        // Only apply significant lateral movement when actually drifting
        const lateralMultiplier = (Math.abs(this.steeringAngle) > 0.01 && Math.abs(this.velocity) > 1) ? 1 : 0.1
        const lateralX = Math.cos(this.rotation) * this.lateralVelocity * lateralMultiplier
        const lateralY = Math.sin(this.rotation) * this.lateralVelocity * lateralMultiplier

        this.worldPosition.x += forwardX + lateralX
        this.worldPosition.y += forwardY + lateralY

        // Update collision shape
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
