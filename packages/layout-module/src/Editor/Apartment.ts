import { Container, FederatedPointerEvent, Graphics } from "pixi.js"
import { assertUnreachable, makeUuid } from "../func"
import { drawOutline } from "./func"
import { Subject } from "rxjs"
import { IDisposable } from "./IDisposable"
import { PointLike } from "../types"

export class Apartment implements IDisposable {
    private _id = makeUuid()
    private _container = new Container()
    private _areaGraphics = new Graphics({ eventMode: 'static' })
    private _eventSubject = new Subject<ApartmentEvent>()
    private _state: 'normal' | 'hover' | 'selected' = 'normal'

    get id() {
        return this._id
    }

    get container() {
        return this._container
    }

    get events() {
        return this._eventSubject.asObservable()
    }

    constructor(private _points: PointLike[]) {
        const { _areaGraphics, _container } = this
        _container.addChild(_areaGraphics)
        _areaGraphics.on('mouseenter', e => this.mouseEnter(e))
        _areaGraphics.on('mouseleave', e => this.mouseLeave(e))
        _areaGraphics.on('click', e => this.mouseClick(e))
        this.render()
    }

    private mouseEnter(_event: FederatedPointerEvent) {
        this._state = 'hover'
        this.render()
    }

    private mouseLeave(_event: FederatedPointerEvent) {
        this._state = 'normal'
        this.render()
    }

    private mouseClick(_event: FederatedPointerEvent) {
        this._eventSubject.next({
            type: 'apartment-click',
            apartment: this
        })
    }

    private render() {
        const { _areaGraphics } = this
        _areaGraphics.clear()
        drawOutline(_areaGraphics, this._points)
        _areaGraphics.fill({ color: this.getFillColor() })
        _areaGraphics.stroke({ color: 0x0, pixelLine: true, width: 1 })
    }

    private getFillColor() {
        switch (this._state) {
            case 'normal': return 0xffffff
            case 'hover': return 0xaaaaff
            case 'selected': return 0x4444ff
            default: return assertUnreachable(this._state)
        }
    }

    public select() {
        this._state = 'selected'
        this.render()
    }

    public dispose() {
        const { _areaGraphics, _container, _eventSubject } = this

        _container.removeChildren()
        _areaGraphics.destroy()
        _eventSubject.complete()

        _areaGraphics.off('mouseenter', this.mouseEnter)
        _areaGraphics.off('mouseleave', (this.mouseLeave))
    }
}

export interface ApartmentEvent {
    type: 'apartment-click' | 'apartment-mouseover' | 'apartment-mouseout'
    apartment: Apartment
}