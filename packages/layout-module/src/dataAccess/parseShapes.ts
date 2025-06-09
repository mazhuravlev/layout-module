import { ApartmentTemplate } from '../types'

// Тип, соответствующий одному объекту из JSON
interface RawShapeData {
  Type: string
  Vector3: Array<{
    X: number
    Y: number
    Z: number
  }>
}

/**
 * При желании можно масштабировать (scale)
 * и смещать (приводить минимум к 0).
 */
function convertRawShapeToParsed(raw: RawShapeData): ApartmentTemplate {
  // 1) найдём minX/minY, если хотим сдвигать
  const xs = raw.Vector3.map((v) => v.X)
  const ys = raw.Vector3.map((v) => v.Y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)

  // переводим размеры в мм
  const scale = 10

  // 2) Собираем points (x1,y1,x2,y2,...) в локальных координатах
  const points = raw.Vector3.flatMap((v) => {
    const localX = (v.X - minX) * scale
    const localY = (v.Y - minY) * scale
    return { x: localX, y: localY }
  })

  return {
    name: raw.Type,
    points,
  }
}

/**
 * Главная функция, которую вы вызываете, чтобы преобразовать
 * массив объектов из вашего JSON в массив ShapeConfig
 */
export function parseShapes(data: RawShapeData[]): ApartmentTemplate[] {
  return data.map(convertRawShapeToParsed)
}
