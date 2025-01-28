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

export interface Obstacle {
  position: Position
  width: number
  height: number
}
