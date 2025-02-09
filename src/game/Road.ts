import type { Position, RoadConfig } from './types'
import { DEFAULT_ROAD_CONFIG } from './types'
import { Car } from './Car'
import { ObstacleManager } from './ObstacleManager'
import { RoadRenderer } from './RoadRenderer'

export class Road {
  private config: RoadConfig
  private lastCarY = 0
  private obstacleManager: ObstacleManager
  private renderer: RoadRenderer

  constructor(width?: number, height?: number, config: Partial<RoadConfig> = {}) {
    this.config = {
      ...DEFAULT_ROAD_CONFIG,
      ...config,
      width: width ?? DEFAULT_ROAD_CONFIG.width,
      height: height ?? DEFAULT_ROAD_CONFIG.height
    }

    this.obstacleManager = new ObstacleManager(this.config)
    this.renderer = new RoadRenderer(this.config)
  }

  public resize(width: number, height: number): void {
    this.config = { ...this.config, width, height }
    this.renderer.resize(width, height)
  }

  public update(): void {
    this.obstacleManager.update(this.lastCarY)
  }

  public draw(ctx: CanvasRenderingContext2D, carWorldPos: Position, speed: number = 0): void {
    this.lastCarY = carWorldPos.y
    this.renderer.draw(ctx, carWorldPos, this.obstacleManager.getObstacles(), speed)
  }

  public checkCollision(car: Car): boolean {
    return this.obstacleManager.checkCollision(
      car.getWorldPosition(),
      car.getWidth(),
      car.getHeight()
    )
  }
}
