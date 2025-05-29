import { Polygon } from 'pixi.js'
import { ALine, APoint, TPoints } from './types'
import { pairwise } from './func'

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

/**
 * Строит прямоугольник вокруг линии, заданной двумя точками, с указанной шириной и отступом
 * @param p1 Первая точка линии
 * @param p2 Вторая точка линии
 * @param width Ширина прямоугольника (перпендикулярно линии)
 * @param padding Отступ от точек p1 и p2 вдоль линии
 */
export function makeLineHitbox(
  p1: APoint,
  p2: APoint,
  width: number,
  padding: number
): APoint[] {
  // Вектор направления линии
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y

  // Нормализуем вектор
  const length = Math.sqrt(dx * dx + dy * dy)
  if (length === 0) {
    throw new Error('Points must be distinct')
  }

  const nx = dx / length
  const ny = dy / length

  // Перпендикулярный вектор (повернутый на 90 градусов)
  const perpX = -ny
  const perpY = nx

  // Половина ширины в каждую сторону
  const halfWidth = width / 2

  // Вычисляем смещенные точки с учетом отступа
  const p1Start = {
    x: p1.x + nx * padding,
    y: p1.y + ny * padding
  }

  const p2End = {
    x: p2.x - nx * padding,
    y: p2.y - ny * padding
  }

  // Вычисляем 4 угла прямоугольника
  const points: APoint[] = [
    // Первая точка + перпендикуляр в одну сторону
    {
      x: p1Start.x + perpX * halfWidth,
      y: p1Start.y + perpY * halfWidth
    },
    // Первая точка + перпендикуляр в другую сторону
    {
      x: p1Start.x - perpX * halfWidth,
      y: p1Start.y - perpY * halfWidth
    },
    // Вторая точка + перпендикуляр в другую сторону
    {
      x: p2End.x - perpX * halfWidth,
      y: p2End.y - perpY * halfWidth
    },
    // Вторая точка + перпендикуляр в одну сторону
    {
      x: p2End.x + perpX * halfWidth,
      y: p2End.y + perpY * halfWidth
    }
  ]

  return points
}

/**
 * Вычисляет расстояние от точки до линии, заданной двумя точками
 * @param linePoint1 Первая точка линии
 * @param linePoint2 Вторая точка линии
 * @param point Точка, для которой вычисляется расстояние
 * @returns Расстояние от точки до линии
 */
export function distanceFromPointToLine([linePoint1, linePoint2]: TPoints, point: APoint): number {
  // Если точки линии совпадают, возвращаем расстояние между точками
  if (linePoint1.x === linePoint2.x && linePoint1.y === linePoint2.y) {
    return Math.sqrt((point.x - linePoint1.x) ** 2 + (point.y - linePoint1.y) ** 2)
  }

  // Числитель формулы расстояния от точки до прямой
  const numerator = (
    (linePoint2.y - linePoint1.y) * point.x -
    (linePoint2.x - linePoint1.x) * point.y +
    linePoint2.x * linePoint1.y -
    linePoint2.y * linePoint1.x
  )

  // Знаменатель формулы
  const denominator = Math.sqrt(
    (linePoint2.y - linePoint1.y) ** 2 +
    (linePoint2.x - linePoint1.x) ** 2
  )

  return numerator / denominator
}

/**
 * Смещает отрезок параллельно на указанное расстояние
 * @param line Отрезок, заданный двумя точками [p1, p2]
 * @param distance Расстояние для смещения (может быть отрицательным)
 * @returns Новый отрезок, смещенный параллельно исходному
 */
export function shiftLine(line: TPoints, distance: number): TPoints {
  const [p1, p2] = line

  // Вычисляем вектор направления отрезка
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y

  // Если отрезок вырожден (точки совпадают), возвращаем исходный отрезок
  if (dx === 0 && dy === 0) {
    return [p1, p2]
  }

  // Вычисляем длину отрезка
  const length = Math.sqrt(dx * dx + dy * dy)

  // Нормализованный перпендикулярный вектор (повернутый на 90 градусов)
  const perpX = (-dy / length) * distance
  const perpY = (dx / length) * distance

  // Смещаем обе точки на перпендикулярный вектор
  const newP1 = {
    x: p1.x + perpX,
    y: p1.y + perpY
  }

  const newP2 = {
    x: p2.x + perpX,
    y: p2.y + perpY
  }

  return [newP1, newP2]
}

/**
 * Находит соседние элементы для заданного элемента массива (циклический поиск)
 * @param array Массив элементов
 * @param targetElement Элемент, для которого ищем соседей
 * @returns Объект с left (предыдущий) и right (следующий) элементами
 * @throws Если элемент не найден в массиве
 */
export function findCircularAdjacentElements<T>(array: T[], targetElement: T): { left: T; right: T } {
  const index = array.indexOf(targetElement)

  if (index === -1) {
    throw new Error('Элемент не найден в массиве')
  }

  const length = array.length

  return {
    left: array[(index - 1 + length) % length],
    right: array[(index + 1) % length]
  }
}

/**
 * Проверяет, лежат ли две линии на одной прямой (коллинеарны)
 */
export const areLinesCollinear = (line1: ALine, line2: ALine): boolean => {
  const { start: a1, end: a2 } = line1
  const { start: b1, end: b2 } = line2

  // Skip if either segment is zero-length
  if (isSamePoint(a1, a2) || isSamePoint(b1, b2)) {
    return false
  }

  // Vectors of the lines
  const vecA = { x: a2.x - a1.x, y: a2.y - a1.y }
  const vecB = { x: b2.x - b1.x, y: b2.y - b1.y }

  // Cross product to determine collinearity
  const cross = vecA.x * vecB.y - vecA.y * vecB.x

  return Math.abs(cross) < 1e-10
}

export const pointsToLines = (points: APoint[]): ALine[] => {
  if (points.length < 4) throw new Error('points is not an outline (points.length < 4)')
  return pairwise([...points, points[0]])
    .map(([start, end]): ALine => ({ start, end }))
}

export const isSamePoint = (point1: APoint, point2: APoint, e = 0.001): boolean => {
  return Math.hypot(point1.x - point2.x, point1.y - point2.y) < e
}

export const isClosedPolyline = (points: APoint[]): boolean => {
  if (points.length < 4) throw new Error('points is not an outline (points.length < 4)')
  return isSamePoint(points[0], points[points.length - 1])
}

export const closePolygon = (points: APoint[]): APoint[] => {
  if (points.length < 4) throw new Error('points is not an outline (points.length < 4)')
  if (isClosedPolyline(points)) return points
  return [...points, points[0]]
}

export const joinCollinearWalls = (points: APoint[], e = 0.001): APoint[] => {
  if (points.length < 3) return [...points] // nothing to simplify

  const simplified: APoint[] = []

  for (let i = 0; i < points.length; i++) {
    const prev = points[(i - 1 + points.length) % points.length]
    const curr = points[i]
    const next = points[(i + 1) % points.length]

    const line1: ALine = { start: prev, end: curr }
    const line2: ALine = { start: curr, end: next }

    if (!areLinesCollinear(line1, line2)) {
      simplified.push(curr)
    }
  }

  // Preserve closure if original was closed
  const isClosedOriginal = isSamePoint(points[0], points[points.length - 1], e)
  const isClosedNow = simplified.length > 0 && isSamePoint(simplified[0], simplified[simplified.length - 1], e)

  if (isClosedOriginal && !isClosedNow) {
    return [...simplified, simplified[0]]
  }

  return simplified.length >= 3 ? simplified : points
}

export const filterZeroLengthWalls = (points: APoint[], e = 0.001): APoint[] => {
  if (points.length < 4) throw new Error('points is not an outline (points.length < 4)')

  const filtered: APoint[] = []

  for (let i = 0; i < points.length; i++) {
    const current = points[i]
    const previous = points[(i - 1 + points.length) % points.length]

    if (!isSamePoint(current, previous, e)) {
      filtered.push(current)
    }
  }

  // After filtering, ensure the polygon remains closed if it was originally closed
  const isClosed = isSamePoint(filtered[0], filtered[filtered.length - 1], e)
  if (!isClosed && isSamePoint(points[0], points[points.length - 1], e)) {
    return [...filtered, filtered[0]]
  }

  return filtered
}

export const lineCenter = (line: TPoints): APoint => {
  const [p1, p2] = line
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2
  }
}

export const isVerticalLine = (line: TPoints): 1 | -1 | false => {
  const [p1, p2] = line
  if (Math.abs(p1.x - p2.x) < 1e-10) {
    return p1.y > p2.y ? 1 : -1
  }
  return false
}

export const ensureClockwisePolygon = (points: APoint[]) =>
  (new Polygon(points)).isClockwise() ? points : [...points].reverse()

/**
 * Вычисляет угловой коэффициент (slope) прямой, проходящей через две точки.
 * @param start Начальная точка отрезка.
 * @param end Конечная точка отрезка.
 * @returns Угловой коэффициент или `null` для вертикальной прямой.
 */
export function getSlope(start: APoint, end: APoint): number | null {
  const deltaX = end.x - start.x

  // Вертикальная прямая (деление на 0)
  if (deltaX === 0) {
    return null
  }

  return (end.y - start.y) / deltaX
}

export const lineLength = (line: TPoints): number => {
  const [p1, p2] = line
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2)
}

export function getLineLength(line: ALine): number {
  return Math.sqrt(
    Math.pow(line.end.x - line.start.x, 2) +
    Math.pow(line.end.y - line.start.y, 2)
  )
}

export function interpolatePoint(start: APoint, end: APoint, t: number): APoint {
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t
  }
}

export function projectPointOnLine(point: APoint, line: ALine): APoint {
  const { start, end } = line
  const lineLength = getLineLength(line)

  if (lineLength === 0) return start

  const t = Math.max(0, Math.min(1,
    ((point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y)) / (lineLength * lineLength)
  ))

  return interpolatePoint(start, end, t)
}

export function getPointDistance(p1: APoint, p2: APoint): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
}
/**
 * Создаёт offset (смещённый) многоугольник.
 * @param points Исходные точки многоугольника.
 * @param offset Величина смещения (>0 наружу, <0 внутрь).
 * @param closed Замкнут ли многоугольник (true по умолчанию).
 * @returns Новый массив точек смещённого многоугольника.
 */

export function offsetPolygon(points: APoint[], offset: number, closed: boolean = true): APoint[] {
  if (points.length < 3 && closed) {
    throw new Error('Для замкнутого многоугольника нужно минимум 3 точки.')
  }

  const newPoints: APoint[] = []
  const n = points.length

  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n]
    const curr = points[i]
    const next = points[(i + 1) % n]

    // Векторы рёбер
    const edge1 = { x: curr.x - prev.x, y: curr.y - prev.y }
    const edge2 = { x: next.x - curr.x, y: next.y - curr.y }

    // Нормали к рёбрам (перпендикуляр, нормализованный)
    const norm1 = normalize({ x: -edge1.y, y: edge1.x })
    const norm2 = normalize({ x: -edge2.y, y: edge2.x })

    // Усреднённая нормаль (для внутренних углов)
    const avgNorm = normalize({
      x: (norm1.x + norm2.x),
      y: (norm1.y + norm2.y),
    })

    // Коррекция для острых углов (чтобы избежать "всплесков")
    const miterLength = 1 / Math.sqrt(avgNorm.x ** 2 + avgNorm.y ** 2)
    const limitedMiterLength = Math.min(miterLength, 2) // Ограничение, чтобы избежать артефактов

    newPoints.push({
      x: curr.x + avgNorm.x * offset * limitedMiterLength,
      y: curr.y + avgNorm.y * offset * limitedMiterLength,
    })
  }

  return newPoints
}
/** Нормализует вектор (делает длину = 1). */

export function normalize(v: APoint): APoint {
  const length = Math.sqrt(v.x ** 2 + v.y ** 2)
  return length > 0 ? { x: v.x / length, y: v.y / length } : { x: 0, y: 0 }
}
