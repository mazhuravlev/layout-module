import { Store } from 'effector'
import { fromEventPattern, Observable } from 'rxjs'
import { v4 as uuid } from 'uuid'
import { Container, FederatedEventMap, Matrix } from 'pixi.js'
import { MatrixDto } from './Editor/dto'

export const assertDefined = <T>(value: T | null | undefined, cause?: string): T => {
  if (value === null || value === undefined) {
    throw new Error('assertDefined', { cause })
  }
  return value
}

export const assert = (v: boolean, cause?: string): v is true => {
  if (!v) {
    throw new Error('assert', { cause })
  }
  return true
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

/**
 * Затемняет HEX-цвет на указанное количество пунктов.
 * @param {number} color - Исходный цвет в формате 0xRRGGBB.
 * @param {number} amount - На сколько пунктов затемнить (0–255).
 * @returns {number} Затемненный цвет в формате 0xRRGGBB.
 */
export function darkenColor(color: number, amount: number) {
  // Извлекаем компоненты RGB
  let r = (color >> 16) & 0xFF
  let g = (color >> 8) & 0xFF
  let b = color & 0xFF

  // Затемняем каждый компонент (не опускаясь ниже 0)
  r = Math.max(0, r - amount)
  g = Math.max(0, g - amount)
  b = Math.max(0, b - amount)

  // Собираем обратно в HEX
  return (r << 16) | (g << 8) | b
}

export function degreesToRadians(degrees: number) {
  return degrees * (Math.PI / 180)
}

export const not = (v: boolean): boolean => !v
export const notNull = <T>(v: T | null): v is T => v !== null
export const isNull = <T>(v: T | null): v is null => v === null
export const isDefined = <T>(v: T | undefined): v is T => v !== undefined
export const isUndefined = <T>(v: T | undefined): v is undefined => v === undefined
export const empty = <T>(v: T[]) => v.length === 0
export const notEmpty = <T>(v: T[]) => v.length > 0

/**
 * Вызвать функцию со значением, если оно не равно null
 * @param o значение
 * @param fn функция
 */
export const withNullable = <T>(o: T | null | undefined, fn: (o: T) => void) => {
  if (o) fn(o)
}

export function fromPixiEvent<T extends Container, K extends keyof FederatedEventMap>(
  target: T,
  eventName: K
): Observable<FederatedEventMap[K]> {
  return fromEventPattern<FederatedEventMap[K]>(
    (handler: (event: FederatedEventMap[K]) => void) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      target.on(eventName, handler as any),
    (handler: (event: FederatedEventMap[K]) => void) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      target.off(eventName, handler as any)
  )
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

export const serializeMatrix = (matrix: Matrix): MatrixDto => {
  const { a, b, c, d, tx, ty } = matrix
  return { a, b, c, d, tx, ty }
}

export const deserializeMatrix = (dto: MatrixDto): Matrix => {
  const { a, b, c, d, tx, ty } = dto
  return new Matrix(a, b, c, d, tx, ty)
}