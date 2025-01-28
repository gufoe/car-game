export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  speed: number;
  rotation: number;
}

export type StatType = 'handling' | 'maxSpeed' | 'acceleration';

export interface Upgrade {
  position: Position;
  type: StatType;
  value: number;
  size: number;
  collected: boolean;
}

export interface CarStats {
  handling: number;    // 0-100
  maxSpeed: number;    // 0-100
  acceleration: number; // 0-100
}

export interface Car {
  position: Position;
  rotation: number;  // in radians
  velocity: Velocity;
  acceleration: number;
  width: number;
  height: number;
  stats: CarStats;
}

export interface Obstacle {
  position: Position;
  width: number;
  height: number;
}

export interface TrackPoint {
  x: number;
  y: number;
  angle: number;
}

export interface GameControls {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}

export interface GameState {
  car: Car;
  controls: GameControls;
  upgrades: Upgrade[];
  lastUpgradeTime: number;
  obstacles: Obstacle[];
  score: number;
  distance: number;
}
