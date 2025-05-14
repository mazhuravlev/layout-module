import { v4 as uuid } from 'uuid'

export const assertDefined = <T>(value: T | null | undefined): T => {
  if (value === null || value === undefined) {
    throw new Error('assertDefined')
  }
  return value
}

export const assert = (v: boolean, message?: string): void => {
  if (!v) {
    throw new Error(message || 'assert')
  }
}

export const assertUnreachable = (_x: never): never => {
  throw new Error('Didn\'t expect to get here')
}

export const pairwise = <T>(array: T[]): T[][] => {
  if (array.length < 2)
    throw new Error('Array must have at least 2 elements to create pairs')

  const result: T[][] = []
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