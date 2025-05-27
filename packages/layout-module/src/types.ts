import { Subscription as RxSubscription } from 'rxjs'
import { Subscription as EffectorSubscription } from 'effector'

export type APoint = {
    x: number
    y: number
}
export function aPoint(point: APoint): APoint
export function aPoint(coords: [number, number]): APoint
export function aPoint(arg: APoint | [number, number]): APoint {
    if (Array.isArray(arg)) {
        return { x: arg[0], y: arg[1] }
    } else {
        return { x: arg.x, y: arg.y }
    }
}

export const subtractVectors = (a: APoint, b: APoint): APoint => ({ x: a.x - b.x, y: a.y - b.y })
export const addVectors = (a: APoint, b: APoint): APoint => ({ x: a.x + b.x, y: a.y + b.y })

export type TPoints = [APoint, APoint]

export interface ALine {
    start: APoint;
    end: APoint;
}

export const mapLine = (mapFn: (x: APoint) => APoint) => (a: ALine): ALine =>
    ({ start: mapFn(a.start), end: mapFn(a.end) })

export const mapPoint = (mapFn: (x: number) => number) => (a: APoint): APoint =>
    ({ x: mapFn(a.x), y: mapFn(a.y) })

export interface ApartmentTemplate {
    name: string
    points: APoint[]
}

export interface IDisposable {
    dispose(): void
}

export type CoordType = 'local' | 'global'

export type ASubscription = RxSubscription | EffectorSubscription
export const unsubscribe = (s: ASubscription) => s.unsubscribe()