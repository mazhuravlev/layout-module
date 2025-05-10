import { Graphics } from 'pixi.js'
import { Point } from './types'

export const drawOutline = (graphics: Graphics, points: Point[]) => {
  graphics.clear()
  graphics.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) {
    graphics.lineTo(points[i].x, points[i].y)
  }
  graphics.lineTo(points[0].x, points[0].y)
  graphics.stroke({ color: 0x0, pixelLine: false, width: 1 })
}
