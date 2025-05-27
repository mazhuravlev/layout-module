import { Container, FederatedPointerEvent } from 'pixi.js'
import { IDisposable } from '../types'
import { AppEvent } from '../EventService/eventTypes'
import { EventService } from '../EventService/EventService'
import { makeUuid } from '../func'

export abstract class EditorObject implements IDisposable {
    protected _id = makeUuid()
    protected _isSelected: boolean = false
    protected _isHovered: boolean = false

    public get isSelectable() { return false }

    public get id() { return this._id }

    public abstract get container(): Container

    constructor(
        protected _eventService: EventService,
    ) {
    }

    public setSelected(selected: boolean) {
        this._isSelected = selected
        this.render()
    }

    public setHovered(hovered: boolean) {
        this._isHovered = hovered
        this.render()
    }

    protected abstract render(): void

    public abstract dispose(): void

    public abstract clone(): EditorObject

    public abstract createDragOutline(): Container

    protected emit(pixiEvent: FederatedPointerEvent, type: AppEvent['type'], stopEvent = true) {
        if (stopEvent) {
            pixiEvent.preventDefault()
            pixiEvent.stopPropagation()
        }
        this._eventService.emit({
            type,
            target: this,
            pixiEvent,
        })
    }
}