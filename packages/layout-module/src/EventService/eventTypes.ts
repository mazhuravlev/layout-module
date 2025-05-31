import { Bounds, FederatedPointerEvent } from 'pixi.js'
import { EditorObject } from '../entities/EditorObject'

interface BaseEvent {
    type: string
}

interface TargetEvent {
    target: EditorObject
}

interface OptionalTargetEvent {
    target?: EditorObject
}

export interface MouseDownEvent extends BaseEvent, OptionalTargetEvent {
    type: 'mousedown'
    pixiEvent: FederatedPointerEvent
}

export interface MouseUpEvent extends BaseEvent, OptionalTargetEvent {
    type: 'mouseup'
    pixiEvent: FederatedPointerEvent
}

export interface MouseEnterEvent extends BaseEvent, TargetEvent {
    type: 'mouseenter'
    pixiEvent: FederatedPointerEvent
}

export interface MouseLeaveEvent extends BaseEvent, TargetEvent {
    type: 'mouseleave'
    pixiEvent: FederatedPointerEvent
}

export interface MouseMoveEvent extends BaseEvent {
    type: 'mousemove'
    pixiEvent: FederatedPointerEvent
}

export interface DocumentUpdateEvent {
    type: 'documentUpdate'
}

export interface SelectionFrameEvent {
    type: 'selectionFrame'
    bounds: Bounds
    selectionType: 'window' | 'crossing'
}

export type AppEvent =
    | MouseDownEvent
    | MouseUpEvent
    | MouseMoveEvent
    | MouseEnterEvent
    | MouseLeaveEvent
    | DocumentUpdateEvent
    | SelectionFrameEvent