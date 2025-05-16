import { Graphics, Polygon } from 'pixi.js'
import { EventService } from '../EventService/EventService'
import { APoint, ASubscription, CoordType, EditorObject, IDisposable, TPoints, unsubscribe } from './types'
import { Apartment } from './Apartment'
import { defaultConfig } from './defaultConfig'
import { makeLineHitbox } from './func'
import { $debugConfig } from '../components/events'

export class Wall extends EditorObject implements IDisposable {
    private _drawDebug = $debugConfig.getState().drawDebug
    private _graphics = new Graphics()
    private _config = defaultConfig
    private _subscriptions: ASubscription[] = []

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
        _graphics.on('mouseenter', () => this.render(this._config.hoverStrokeColor))
        _graphics.on('mouseleave', () => this.render(this._config.strokeColor))
        _graphics.on('mousedown', event => _eventService.emit({ type: 'mousedown', pixiEvent: event, target: this }))
        _graphics.on('mouseup', event => _eventService.emit({ type: 'mouseup', pixiEvent: event, target: this }))
        this._subscriptions.push($debugConfig
            .map(x => x.drawDebug)
            .watch(x => {
                this._drawDebug = x
                this.render(this._config.strokeColor)
            }))
    }

    public render(color: number) {
        const [p1, p2] = this._points
        const { _graphics } = this
        const HITBOX_WIDTH = 10
        const hitbox = makeLineHitbox(p1, p2, HITBOX_WIDTH, HITBOX_WIDTH / 2)
        _graphics.clear()
        if (this._drawDebug) {
            _graphics.poly(hitbox)
            _graphics.fill({ color: 0xaaffaa, alpha: 0.5 })
        }
        _graphics.moveTo(p1.x, p1.y)
        _graphics.lineTo(p2.x, p2.y)
        _graphics.stroke({ color, width: 1, pixelLine: true })
        _graphics.hitArea = new Polygon(hitbox)
    }

    public dispose() {
        this._graphics.removeAllListeners()
        this._subscriptions.forEach(unsubscribe)
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
            throw new Error('updateStart is not supported for local coordinates')
        } else {
            this._points = [this._graphics.toLocal(point), this.points[1]]
        }
        this.render(this._config.strokeColor)
    }
}
