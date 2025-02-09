import type { Position, RoadConfig } from './types'
import { DEFAULT_ROAD_CONFIG } from './types'
import { Car } from './Car'
import { MapEntityManager } from './entities/MapEntityManager'
import { RoadRenderer } from './RoadRenderer'

export class Road {
  private config: RoadConfig
  private lastCarY = 0
  private entityManager: MapEntityManager
  private renderer: RoadRenderer
  private lastTimestamp = 0

  constructor(width?: number, height?: number, config: Partial<RoadConfig> = {}) {
    this.config = {
      ...DEFAULT_ROAD_CONFIG,
      ...config,
      width: width ?? DEFAULT_ROAD_CONFIG.width,
      height: height ?? DEFAULT_ROAD_CONFIG.height
    }

    this.entityManager = new MapEntityManager(this.config)
    this.renderer = new RoadRenderer(this.config)
  }

  public resize(width: number, height: number): void {
    this.config = { ...this.config, width, height }
    this.renderer.resize(width, height)
  }

  public update(timestamp = 0): void {
    const deltaTime = timestamp - this.lastTimestamp
    this.lastTimestamp = timestamp
    this.entityManager.update(this.lastCarY, deltaTime)
  }

  public draw(ctx: CanvasRenderingContext2D, carWorldPos: Position, speed: number = 0): void {
    this.lastCarY = carWorldPos.y
    this.renderer.draw(ctx, carWorldPos, this.entityManager.getEntities(), speed)
  }

  public checkCollision(car: Car): boolean {
    return this.entityManager.checkCollision(car)
  }
}
