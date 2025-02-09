import type { Controls, GameState } from './types'
import { Car, type CarStats } from './Car'
import { Road } from './Road'
import { Camera } from './Camera'

export class Game {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private car: Car
  private road: Road
  private camera: Camera
  private controls: Controls = {
    up: false,
    down: false,
    left: false,
    right: false
  }
  private gameState: GameState = {
    score: 0,
    distance: 0,
    isGameOver: false
  }
  private animationFrameId: number | null = null
  private lastTimestamp = 0
  private isDebugMode = false

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Could not get 2D context from canvas')
    }
    this.ctx = context

    // Initialize game objects with default car stats
    const defaultCarStats: CarStats = {
      maxSpeed: 10,
      acceleration: 0.2,
      handling: 0.8
    }
    this.car = new Car(canvas.width, canvas.height, defaultCarStats)
    this.road = new Road(canvas.width, canvas.height)
    this.camera = new Camera(canvas.width, canvas.height)

    // Set up event listeners
    window.addEventListener('keydown', this.handleKeyDown.bind(this))
    window.addEventListener('keyup', this.handleKeyUp.bind(this))
    window.addEventListener('resize', this.handleResize.bind(this))

    // Add debug mode toggle listener
    window.addEventListener('keydown', (e) => {
      if (e.key === '`' || e.key === '~') {
        this.isDebugMode = !this.isDebugMode
        // Prevent the key from triggering browser's console
        e.preventDefault()
      }
    })

    // Initial resize
    this.handleResize()
  }

  private handleKeyDown(event: KeyboardEvent): void {
    switch (event.key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        this.controls.up = true
        break
      case 's':
      case 'arrowdown':
        this.controls.down = true
        break
      case 'a':
      case 'arrowleft':
        this.controls.left = true
        break
      case 'd':
      case 'arrowright':
        this.controls.right = true
        break
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    switch (event.key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        this.controls.up = false
        break
      case 's':
      case 'arrowdown':
        this.controls.down = false
        break
      case 'a':
      case 'arrowleft':
        this.controls.left = false
        break
      case 'd':
      case 'arrowright':
        this.controls.right = false
        break
    }
  }

  private handleResize(): void {
    // Update canvas size
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight

    // Update road size
    this.road.resize(this.canvas.width, this.canvas.height)

    // Update camera
    this.camera.updateScreenSize(this.canvas.width, this.canvas.height)
  }

  public start(): void {
    this.gameState.isGameOver = false
    this.gameState.score = 0
    this.gameState.distance = 0
    this.lastTimestamp = performance.now()
    this.animate()
  }

  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  private animate(timestamp = 0): void {
    const deltaTime = timestamp - this.lastTimestamp
    this.lastTimestamp = timestamp

    // Update game state
    if (!this.gameState.isGameOver) {
      // Update car
      this.car.update(this.controls)

      // Update road (for entity generation and updates)
      this.road.update(timestamp)

      // Get car's world position for camera and scoring
      const worldPos = this.car.getWorldPosition()

      // Update camera
      this.camera.update(worldPos, this.car.getVelocity())

      // Update score based on distance traveled
      this.gameState.distance = Math.abs(worldPos.y)
      this.gameState.score = Math.floor(this.gameState.distance / 100)

      // Check for collisions
      this.road.checkCollision(this.car)

      // Update game over state based on car's crash state
      if (this.car.isCrashed()) {
        this.gameState.isGameOver = true
      }
    }

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // Set up camera transformation
    this.ctx.save()
    this.camera.applyTransform(this.ctx)

    // Draw game objects (passing car's world position for camera)
    this.road.draw(this.ctx, this.car.getWorldPosition(), this.car.getVelocity(), this.isDebugMode)
    if (!this.isDebugMode) {
      this.car.draw(this.ctx)
    }
    this.car.debugDraw(this.ctx, this.isDebugMode)

    this.ctx.restore()

    // Draw HUD (in screen space)
    this.drawHUD()

    // Continue animation
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this))
  }

  private drawHUD(): void {
    this.ctx.save()
    this.ctx.fillStyle = 'white'
    this.ctx.font = '24px Arial'
    this.ctx.textAlign = 'right'

    // Draw score and speed
    this.ctx.fillText(`Score: ${this.gameState.score}`, this.canvas.width - 20, 40)
    const speed = Math.abs(this.car.getVelocity())
    this.ctx.fillText(`Speed: ${Math.floor(speed * 10)} km/h`, this.canvas.width - 20, 80)

    // Draw game over message
    if (this.gameState.isGameOver) {
      this.ctx.textAlign = 'center'
      this.ctx.font = '48px Arial'
      this.ctx.fillText('Game Over!', this.canvas.width / 2, this.canvas.height / 2)
      this.ctx.font = '24px Arial'
      this.ctx.fillText('Press Space to Restart', this.canvas.width / 2, this.canvas.height / 2 + 40)
    }

    this.ctx.restore()
  }

  public getGameState(): GameState {
    return { ...this.gameState }
  }
}
