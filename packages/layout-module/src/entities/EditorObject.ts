import { FederatedPointerEvent } from 'pixi.js'
import { IDisposable } from '../types'
import { AppEvent } from '../EventService/eventTypes'
import { EventService } from '../EventService/EventService'

export abstract class EditorObject implements IDisposable {
    constructor(
        protected _eventService: EventService,
    ) {
    }

    protected _isSelected: boolean = false
    protected _isHovered: boolean = false

    public setSelected(selected: boolean) {
        this._isSelected = selected
        this.render()
    }

    public setHovered(hovered: boolean) {
        this._isHovered = hovered
        this.render()
    }

    protected render() {

    }

    public dispose(): void {
        throw new Error('Method not implemented.')
    }

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