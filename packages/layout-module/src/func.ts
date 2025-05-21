import { v4 as uuid } from 'uuid'

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
