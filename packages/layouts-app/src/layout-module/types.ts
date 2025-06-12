import type { Subscription as RxSubscription } from 'rxjs'
import type { Subscription as EffectorSubscription } from 'effector'
import type { EditorObjectDto } from './Editor/dto'

export type APoint = {
    x: number
    y: number
}

export interface ALine {
    start: APoint
    end: APoint
}

export interface IDisposable {
    dispose(): void
}

export type ASubscription = RxSubscription | EffectorSubscription
export const unsubscribe = (s: ASubscription) => s.unsubscribe()

export class NotImplemented extends Error { }
export class InvalidOperation extends Error { }
export class LogicError extends Error { }
export class NotFoundError extends Error { }

export type FloorType = 'first' | 'typical'
export type SectionType = 'regular' | 'tower' | 'corner'

export interface EditorDocument {
    sectionId: string
    layoutId: string
    name: string
    floors: { type: FloorType, objects: EditorObjectDto[] }[]
}

export interface ApartmentTemplate {
    name: string
    points: APoint[]
}

export interface LLUTemplate {
    id: string
    name: string
    outline: APoint[]
    geometry: APoint[][]
    minFloors: number
    maxFloors: number
    sectionType: SectionType
}

export type LayoutAddress = { sectionId: string, layoutId: string }
export type FloorRange = { minFloors: number, maxFloors: number }