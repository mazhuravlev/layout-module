import { Subscription as RxSubscription } from 'rxjs'
import { Subscription as EffectorSubscription } from 'effector'

export type APoint = {
    x: number
    y: number
}

export interface ALine {
    start: APoint
    end: APoint
}

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

export class NotImplemented extends Error { }
export class InvalidOperation extends Error { }
export class LogicError extends Error { }

export type FloorType = 'first' | 'typical'
