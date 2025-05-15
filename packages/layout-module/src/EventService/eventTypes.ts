import { FederatedPointerEvent } from 'pixi.js'
import { EditorObject } from '../Editor/types'

interface BaseEvent {
    type: string
}

interface TargetEvent {
    target: EditorObject
}

interface OptionalTargetEvent {
    target?: EditorObject
}

export interface MouseDownEvent extends BaseEvent, TargetEvent {
    type: 'mousedown'
    pixiEvent: FederatedPointerEvent
}

export interface MouseUpEvent extends BaseEvent, OptionalTargetEvent {
    type: 'mouseup'
    pixiEvent: FederatedPointerEvent
}

export interface MouseMoveEvent extends BaseEvent {
    type: 'mousemove'
    pixiEvent: FederatedPointerEvent
}

export type AppEvent =
    | MouseDownEvent
    | MouseUpEvent
    | MouseMoveEvent