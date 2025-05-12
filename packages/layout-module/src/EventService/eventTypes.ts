import { Apartment } from "../Editor/Apartment"

export interface BaseEvent {
    type: string
    target: Apartment
}

export interface ClickEvent extends BaseEvent {
    type: 'click'
}

export interface MouseDownEvent extends BaseEvent {
    type: 'mousedown'
}

export interface MouseUpEvent extends BaseEvent {
    type: 'mouseup'
}

export interface DragEvent extends BaseEvent {
    type: 'drag'
}

export interface MouseEnterEvent extends BaseEvent {
    type: 'mouseenter'
}
export interface MouseLeaveEvent extends BaseEvent {
    type: 'mouseleave'
}

export type AppEvent =
    | ClickEvent
    | MouseDownEvent
    | MouseUpEvent
    | DragEvent
    | MouseEnterEvent
    | MouseLeaveEvent