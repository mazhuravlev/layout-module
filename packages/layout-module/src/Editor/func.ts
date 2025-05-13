import { Application, Graphics } from 'pixi.js'
import { PointLike } from '../types'

export function calculateZoomToExtents(app: Application, padding: number) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  app.stage.children.forEach((child) => {
    const bounds = child.getBounds()
    minX = Math.min(minX, bounds.x)
    minY = Math.min(minY, bounds.y)
    maxX = Math.max(maxX, bounds.x + bounds.width)
    maxY = Math.max(maxY, bounds.y + bounds.height)
  })

  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  const width = maxX - minX
  const height = maxY - minY

  const scaleX = (app.screen.width - padding) / width
  const scaleY = (app.screen.height - padding) / height
  const scale = Math.min(scaleX, scaleY)
  return { centerX, scale, centerY }
}

export const drawOutline = (graphics: Graphics, points: PointLike[], fillStyle?: { color: number }) => {
  graphics.clear()
  graphics.lineStyle({ color: 0x0, width: 1 })
  if (fillStyle) graphics.beginFill(fillStyle.color)
  graphics.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) {
    graphics.lineTo(points[i].x, points[i].y)
  }
  graphics.lineTo(points[0].x, points[0].y)
  graphics.closePath()
  graphics.endFill()
}