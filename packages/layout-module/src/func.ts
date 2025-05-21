import { Store } from 'effector'
import { Observable } from 'rxjs'
import { v4 as uuid } from 'uuid'
import { APoint } from './types'

export const assertDefined = <T>(value: T | null | undefined, cause?: string): T => {
  if (value === null || value === undefined) {
    throw new Error('assertDefined', { cause })
  }
  return value
}

export const assert = (v: boolean, cause?: string): void => {
  if (!v) {
    throw new Error('assert', { cause })
  }
}

export const assertUnreachable = (_x: never): never => {
  throw new Error('Didn\'t expect to get here')
}

export const pairwise = <T>(array: T[]): [T, T][] => {
  if (array.length < 2)
    throw new Error('Array must have at least 2 elements to create pairs')

  const result: [T, T][] = []
  for (let i = 0; i < array.length - 1; i++) {
    result.push([array[i], array[i + 1]])
  }

  return result
}

export const first = <T>(array: T[]): T => {
  if (array.length === 0) throw new Error('Array is empty')
  return array[0]
}

export const last = <T>(array: T[]): T => {
  if (array.length === 0) throw new Error('Array is empty')
  return array[array.length - 1]
}

export const makeUuid = () => uuid()

export const returnSecondArg = <T>(_: unknown, x: T): T => x

export const toError = (value: unknown): Error => {
  if (value instanceof Error) return value
  if (typeof value === 'string') return new Error(value)
  if (value instanceof Object && 'toString' in value && typeof value.toString === 'function') return new Error(value.toString())
  return new Error(JSON.stringify(value))
}

/**
 * Identity function that returns the input argument unchanged.
 * 
 * @template T - The type of the input and output value.
 * @param {T} t - The input value.
 * @returns {T} The same input value.
 */
export const identity = <T>(t: T): T => t


export function splitIntoPairs<T>(array: T[] & { length: number }): [T, T][] {
  if (array.length % 2 === 0) {
    return Array.from({ length: array.length / 2 }, (_, i) => [array[i * 2], array[i * 2 + 1]])
  } else {
    throw new Error('Array length must be even')
  }
}

export function fromEffectorStore<T, U>(store: Store<T>, mapFn: (s: T) => U): Observable<U> {
  const mappedStore = store.map(mapFn)
  return new Observable((subscriber) => {
    subscriber.next(mappedStore.getState())
    const unsubscribe = mappedStore.watch((state) => {
      subscriber.next(state)
    })
    return () => unsubscribe()
  })
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