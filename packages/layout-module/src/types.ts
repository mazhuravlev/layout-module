import { Subscription as RxSubscription } from 'rxjs'
import { Subscription as EffectorSubscription } from 'effector'

export type APoint = {
    x: number
    y: number
}
export const aPoint = (a: APoint): APoint => ({ x: a.x, y: a.y })
export const subtractVectors = (a: APoint, b: APoint): APoint => ({ x: a.x - b.x, y: a.y - b.y })
export const addVectors = (a: APoint, b: APoint): APoint => ({ x: a.x + b.x, y: a.y + b.y })

export type TPoints = [APoint, APoint]

export interface ALine {
    start: APoint;
    end: APoint;
}

export const mapLine = (mapFn: (x: APoint) => APoint) => (a: ALine): ALine =>
    ({ start: mapFn(a.start), end: mapFn(a.end) })

export interface ApartmentTemplate {
    name: string
    points: APoint[]
}

export interface IDisposable {
    dispose(): void
}

export type CoordType = 'local' | 'global'

export type ASubscription = RxSubscription | EffectorSubscription
