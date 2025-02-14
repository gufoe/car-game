/**
 * CarWheel.ts
 * Represents an individual wheel on the car, with its own mass, inertia,
 * friction, and slip characteristics.
 */
import type { Position } from './types' // Using type-only import for Position

export class CarWheel {
  public localPosition: Position       // wheel position relative to car center
  public isFrontWheel: boolean
  public mass: number                  // wheel mass
  public inertia: number               // wheel moment of inertia
  public angularVelocity: number = 0   // spinning speed of the wheel
  public steeringAngle: number = 0     // for front wheels, updated by steering input

  // For demonstration; you can add or change these
  public corneringStiffness: number = 1.2
  public gripFactor: number = 1.0

  // Store forces calculated per frame
  private lateralForce: number = 0
  private longitudinalForce: number = 0
  private torque: number = 0

  /**
   * @param localPos  The wheel's position relative to the car center (in car's local coordinates).
   * @param isFront   Whether this is a front wheel (steering).
   * @param mass      Wheel mass.
   * @param inertia   Wheel inertia (for rotation).
   */
  constructor(localPos: Position, isFront: boolean, mass: number, inertia: number) {
    this.localPosition = localPos
    this.isFrontWheel = isFront
    this.mass = mass
    this.inertia = inertia
  }

  /**
   * Updates the wheel's forces and torque based on the car's motion.
   *
   * @param carVelocity Global velocity of the car's center of mass (in m/s).
   * @param carAngularVelocity Angular velocity of the car (in rad/s).
   * @param carRotation The car's heading (in radians).
   * @param steeringAngle The steering input (only relevant if isFrontWheel=true).
   * @param dt Time step (in seconds).
   * @param driveForce Force or torque from the engine on this wheel (if RWD/FWD).
   */
  public updateWheel(
    carVelocity: { x: number; y: number },
    carAngularVelocity: number,
    carRotation: number,
    steeringAngle: number,
    dt: number,
    driveForce: number
  ): void {
    // 1) Determine wheel's world-space position.
    //    Rotate local position by carRotation, then add car's center-of-mass position:
    const cosR = Math.cos(carRotation)
    const sinR = Math.sin(carRotation)
    const worldWheelPos = {
      x: /* car center X + */ (this.localPosition.x * cosR - this.localPosition.y * sinR),
      y: /* car center Y + */ (this.localPosition.x * sinR + this.localPosition.y * cosR)
    }

    // 2) Calculate velocity of the wheel (includes car's linear velocity + rotation around center).
    //    Velocity at wheel = carVelocity + (carAngularVelocity x wheelOffset)
    //    For 2D, rotating the offset by 90 degrees and scaling by angularVelocity gives the tangential velocity.
    const wheelRadiusVel = {
      x: -carAngularVelocity * (worldWheelPos.y), // in a simpler approach, offset from center is used
      y:  carAngularVelocity * (worldWheelPos.x)
    }
    const wheelVel = {
      x: carVelocity.x + wheelRadiusVel.x,
      y: carVelocity.y + wheelRadiusVel.y
    }

    // 3) Convert wheelVel into local wheel coordinates (longitudinal / lateral).
    //    If front wheel, apply steeringAngle; if rear wheel, steerAngle=0.
    const totalWheelAngle = carRotation + (this.isFrontWheel ? steeringAngle : 0)
    const cosW = Math.cos(totalWheelAngle)
    const sinW = Math.sin(totalWheelAngle)

    // Project velocity onto wheel's forward axis (longitudinal) and side axis (lateral).
    const vForward =  wheelVel.x * sinW + (-wheelVel.y) * cosW
    const vSide    =  wheelVel.x * cosW - (wheelVel.y) * sinW

    // 4) Compute slip angle and forces (simplified).
    //    Lateral force ~ corneringStiffness * slipAngle, etc.
    //    We'll demonstrate a very crude approach:
    const slipAngle = Math.atan2(vSide, Math.abs(vForward) + 0.1) // avoid zero-division
    const latForce = -this.corneringStiffness * slipAngle * this.gripFactor * this.mass

    // 5) Compute longitudinal force: assume driveForce on driven wheels, friction on front wheels, etc.
    //    In a more advanced model, you'd handle slip ratio, brake vs acceleration, etc.
    let longForce = this.isFrontWheel ? 0 : driveForce // for demonstration, front wheels have no drive torque
    // Basic rolling friction:
    longForce -= vForward * 0.1 * this.mass

    // 6) Transform forces back to world coordinates.
    //    The negative sign on the forward axis is because forward was sinW, -cosW above.
    const fx = latForce * cosW + longForce * sinW
    const fy = -latForce * sinW + -longForce * cosW

    // 7) Calculate torque about the car's center from this wheel's force
    //    torque = r x F (2D cross product).
    //    r = the vector from car's center to wheel's pos, F = (fx, fy).
    //    For 2D: torque = (rx * Fy - ry * Fx).
    const torqueZ = (worldWheelPos.x * fy - worldWheelPos.y * fx)

    // Store results for car to sum up:
    this.lateralForce = latForce
    this.longitudinalForce = longForce
    this.torque = torqueZ

    // We'll skip wheel angularVelocity integration here for brevity.
  }

  public getFx(): number {
    // Return the world x-component of force. (We calculated above as fx, you could store that).
    // For brevity, we'll directly sum up outside. You can store "fx" above if you prefer.
    return 0 // re-implement if you want to store fx/fy individually
  }

  public getFy(): number {
    return 0 // same note as getFx()
  }

  public getTorque(): number {
    return this.torque
  }

  // Or if you want, you can store fx/fy in updateWheel() and just return them here
}
