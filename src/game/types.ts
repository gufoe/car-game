/** Represents a 2D position with x,y coordinates */
export interface Position {
  x: number
  y: number
}

export interface Controls {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
}

export interface GameState {
  score: number
  distance: number
  isGameOver: boolean
}

export interface RoadConfig {
  width: number
  height: number
  roadWidth: number
  lineSpacing: number
  obstacleWidth: number
  obstacleHeight: number
  obstacleSpacing: number
  wallTransitionScore: number
  initialObstacleY: number
  screenCenterYRatio: number
}

export interface MapEntityEffect {
  type: 'maxSpeed' | 'score' | 'size'
  value: number
  duration: number
  startTime?: number
}

// Default configuration that can be used across the game
export const DEFAULT_ROAD_CONFIG: RoadConfig = {
  width: 800,
  height: 600,
  roadWidth: 800,
  lineSpacing: 80,
  obstacleWidth: 80,
  obstacleHeight: 40,
  obstacleSpacing: 300,
  wallTransitionScore: 5000,
  initialObstacleY: -1000,
  screenCenterYRatio: 0.8
}
