import { Application, DisplayObject, Graphics } from 'pixi.js'
import { APoint } from '../types'

export function calculateZoomToExtents(app: Application, padding: number, objects: DisplayObject[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  objects.forEach((child) => {
    const bounds = child.getBounds(false)
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

export const drawOutline = (graphics: Graphics, points: APoint[], fillStyle?: { color: number }) => {
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

/**
 * Вычисляет центр (центроид) многоугольника
 * @param points Массив точек многоугольника в порядке обхода (по или против часовой стрелки)
 * @returns Точка центра {x, y}
 */
export function getPolygonCenter(points: APoint[]): APoint {
  if (points.length === 0) {
    throw new Error('Polygon must have at least one point')
  }

  // Для многоугольника с одной точкой - возвращаем саму точку
  if (points.length === 1) {
    return { ...points[0] }
  }

  // Для линии - возвращаем середину
  if (points.length === 2) {
    return {
      x: (points[0].x + points[1].x) / 2,
      y: (points[0].y + points[1].y) / 2,
    }
  }

  let area = 0
  let centerX = 0
  let centerY = 0

  // Алгоритм вычисления центроида для многоугольника
  for (let i = 0; i < points.length; i++) {
    const current = points[i]
    const next = points[(i + 1) % points.length]

    const cross = current.x * next.y - next.x * current.y
    area += cross

    centerX += (current.x + next.x) * cross
    centerY += (current.y + next.y) * cross
  }

  area /= 2
  const factor = 1 / (6 * area)

  centerX *= factor
  centerY *= factor

  return { x: centerX, y: centerY }
}

/**
 * Вычисляет площадь многоугольника по формуле шнурования (Shoelace formula)
 * @param points Массив точек многоугольника в порядке обхода (по или против часовой стрелки)
 * @returns Площадь в квадратных единицах (может быть отрицательной для обратного порядка)
 */
export function getPolygonArea(points: APoint[]): number {
  if (points.length < 3) {
    return 0 // Площадь для линии или точки равна 0
  }

  let area = 0
  const n = points.length

  for (let i = 0; i < n; i++) {
    const current = points[i]
    const next = points[(i + 1) % n]
    area += current.x * next.y - next.x * current.y
  }

  return Math.abs(area / 2) // Берем модуль для всегда положительной площади
}

export const formatArea = (area: number) => {
  return `${Math.round(area / 100)} м²`
}