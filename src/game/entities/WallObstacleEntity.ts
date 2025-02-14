import { BaseObstacleEntity } from './BaseObstacleEntity'

export class WallObstacleEntity extends BaseObstacleEntity {
  public static createGap(y: number, roadWidth: number, minGapWidth: number, maxGapWidth: number, obstacleHeight: number): WallObstacleEntity[] {
    const gapWidth = minGapWidth + Math.random() * (maxGapWidth - minGapWidth)
    const gapPosition = -roadWidth/2 + Math.random() * (roadWidth - gapWidth)

    const leftWall = new WallObstacleEntity(
      -roadWidth/2,
      y,
      gapPosition - (-roadWidth/2),
      obstacleHeight
    )

    const rightWall = new WallObstacleEntity(
      gapPosition + gapWidth,
      y,
      roadWidth/2 - (gapPosition + gapWidth),
      obstacleHeight
    )

    return [leftWall, rightWall]
  }
}
