import { Container, FederatedPointerEvent, Graphics } from "pixi.js"
import { assertUnreachable, makeUuid } from "../func"
import { drawOutline } from "./func"
import { IDisposable, PointLike } from "../types"
import { EventService } from "../EventService/EventService"

const defaultConfig = {
    color: 0xffffff,
    strokeColor: 0x0,
    hoverColor: 0xaaaaff,
    selectedColor: 0x4444ff,
}

export class Apartment implements IDisposable {
    private _id = makeUuid()
    private _container = new Container()
    private _areaGraphics = new Graphics({ eventMode: 'static' })
    private _state: 'normal' | 'hover' | 'selected' = 'normal'
    private _config: typeof defaultConfig

    get id() {
        return this._id
    }

    get container() {
        return this._container
    }

    constructor(
        private _points: PointLike[],
        private _eventService: EventService,
        config: Partial<typeof defaultConfig> = {}
    ) {
        this._config = { ...defaultConfig, ...config }
        const { _areaGraphics, _container } = this
        this.render()
        _container.addChild(_areaGraphics)
        _areaGraphics.on('mouseenter', e => this.mouseEnter(e))
        _areaGraphics.on('mouseleave', e => this.mouseLeave(e))
        _areaGraphics.on('mousedown', e => this.mouseDown(e))
        _areaGraphics.on('mouseup', e => this.mouseUp(e))
        _areaGraphics.on('click', e => this.mouseClick(e))
    }

    private mouseEnter(_event: FederatedPointerEvent) {
        _event.stopPropagation()
        if (this._state !== 'selected') {
            this._state = 'hover'
            this.render()
        }
    }

    private mouseLeave(_event: FederatedPointerEvent) {
        _event.stopPropagation()
        if (this._state !== 'selected') {
            this._state = 'normal'
            this.render()
        }
    }

    private mouseClick(_event: FederatedPointerEvent) {
        _event.stopPropagation()
        this._eventService.emit({
            type: 'click',
            target: this,
        })
    }

    private mouseDown(_event: FederatedPointerEvent) {
        _event.stopPropagation()
        this._eventService.emit({
            type: 'mousedown',
            target: this,
        })
    }

    private mouseUp(_event: FederatedPointerEvent) {
        _event.stopPropagation()
        this._eventService.emit({
            type: 'mouseup',
            target: this,
        })
    }

    private render() {
        const { _areaGraphics, _config } = this
        _areaGraphics.clear()
        drawOutline(_areaGraphics, this._points)
        _areaGraphics.fill({ color: this.getFillColor() })
        _areaGraphics.stroke({ color: _config.strokeColor, pixelLine: true, width: 1 })
    }

    private getFillColor() {
        switch (this._state) {
            case 'normal': return this._config.color
            case 'hover': return this._config.hoverColor
            case 'selected': return this._config.selectedColor
            default: return assertUnreachable(this._state)
        }
    }

    public select() {
        this._state = 'selected'
        this.render()
    }

    public deselect() {
        this._state = 'normal'
        this.render()
    }

    public dispose() {
        const { _areaGraphics, _container } = this
        _areaGraphics.removeAllListeners()
        _container.removeChildren()
        _areaGraphics.destroy()
    }
}
