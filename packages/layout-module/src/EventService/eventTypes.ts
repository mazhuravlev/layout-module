import { FederatedPointerEvent } from 'pixi.js'
import { Apartment } from '../Editor/Apartment'

interface BaseEvent {
    type: string
}

interface TargetEvent {
    target: Apartment
}

interface OptionalTargetEvent {
    target?: Apartment
}

export interface MouseDownEvent extends BaseEvent, TargetEvent {
    type: 'mousedown'
    event: FederatedPointerEvent
}

export interface MouseUpEvent extends BaseEvent, OptionalTargetEvent {
    type: 'mouseup'
    event: FederatedPointerEvent
}

export interface MouseMoveEvent extends BaseEvent {
    type: 'mousemove'
    event: FederatedPointerEvent
}

export interface MouseEnterEvent extends BaseEvent, TargetEvent {
    type: 'mouseenter'
}
export interface MouseLeaveEvent extends BaseEvent, TargetEvent {
    type: 'mouseleave'
}

export type AppEvent =
    | MouseDownEvent
    | MouseUpEvent
    | MouseMoveEvent
    | MouseEnterEvent
    | MouseLeaveEvent