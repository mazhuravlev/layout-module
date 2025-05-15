import { Graphics, Polygon } from 'pixi.js'
import { EventService } from '../EventService/EventService'
import { APoint, CoordType, EditorObject, IDisposable, TPoints } from './types'
import { Apartment } from './Apartment'
import { defaultConfig } from './defaultConfig'
import { fromPixiEvent, makeLineHitbox } from './func'
import { debugStore } from '../components/events'


export class Wall extends EditorObject implements IDisposable {
    private _drawDebug = debugStore.getState().drawDebug
    private _graphics = new Graphics()
    private _config = defaultConfig

    public get graphics() { return this._graphics }

    public get apartment() { return this._apartment }

    public get points() { return this._points }

    public get globalPoints(): TPoints {
        return [
            this._graphics.toGlobal(this._points[0]),
            this._graphics.toGlobal(this._points[1])
        ]
    }

    constructor(
        private _eventService: EventService,
        private _apartment: Apartment,
        private _points: TPoints
    ) {
        super()
        const { _graphics } = this
        _graphics.eventMode = 'static'
        this.setupEvents()
        this.render(this._config.strokeColor)
    }

    private setupEvents() {
        const { _eventService, _graphics } = this
        // TODO: unsubscribe on dispose
        fromPixiEvent(_graphics, 'mouseenter')
            .subscribe(() => this.render(this._config.hoverStrokeColor))
        fromPixiEvent(_graphics, 'mouseleave')
            .subscribe(() => this.render(this._config.strokeColor))
        fromPixiEvent(_graphics, 'mousedown')
            .subscribe(event => _eventService.emit({ type: 'mousedown', pixiEvent: event, target: this }))
        fromPixiEvent(_graphics, 'mouseup')
            .subscribe(event => _eventService.emit({ type: 'mouseup', pixiEvent: event, target: this }))
        debugStore
            .map(x => x.drawDebug)
            .watch(x => {
                this._drawDebug = x
                this.render(this._config.strokeColor)
            })
    }

    public render(color: number) {
        const [p1, p2] = this._points
        const { _graphics } = this
        const hitbox = makeLineHitbox(p1, p2, 10, 50)
        _graphics.clear()
        if (this._drawDebug) {
            _graphics.beginFill(0xaaffaa, 0.5)
            _graphics.drawPolygon(hitbox)
            _graphics.endFill()
        }
        _graphics.lineStyle({ color, width: 1 })
        _graphics.moveTo(p1.x, p1.y)
        _graphics.lineTo(p2.x, p2.y)
        _graphics.hitArea = new Polygon(hitbox)
    }

    public dispose() {
    }

    public update(points: TPoints, coordType: CoordType) {
        if (coordType === 'local') {
            this._points = points
        } else {
            this._points = [this._graphics.toLocal(points[0]), this._graphics.toLocal(points[1])]
        }
        this.render(this._config.hoverStrokeColor)
    }

    public updateEnd(point: APoint, coordType: CoordType) {
        if (coordType === 'local') {
            throw new Error('updateEnd is not supported for local coordinates')
        } else {
            this._points = [this.points[0], this._graphics.toLocal(point)]
        }
        this.render(this._config.strokeColor)
    }

    public updateStart(point: APoint, coordType: CoordType) {
        if (coordType === 'local') {
            throw new Error('updateEnd is not supported for local coordinates')
        } else {
            this._points = [this._graphics.toLocal(point), this.points[1]]
        }
        this.render(this._config.strokeColor)
    }
}
