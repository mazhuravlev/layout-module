import { FederatedPointerEvent } from 'pixi.js'
import { Apartment } from '../Editor/Apartment'

export interface BaseEvent {
    type: string
    target: Apartment
}

export interface MouseDownEvent extends BaseEvent {
    type: 'mousedown'
    event: FederatedPointerEvent
}

export interface MouseUpEvent extends BaseEvent {
    type: 'mouseup'
}

export interface MouseMoveEvent extends BaseEvent {
    type: 'mousemove'
    event: FederatedPointerEvent
}

export interface MouseEnterEvent extends BaseEvent {
    type: 'mouseenter'
}
export interface MouseLeaveEvent extends BaseEvent {
    type: 'mouseleave'
}

export type AppEvent =
    | MouseDownEvent
    | MouseUpEvent
    | MouseMoveEvent
    | MouseEnterEvent
    | MouseLeaveEvent