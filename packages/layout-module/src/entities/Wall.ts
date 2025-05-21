import { Graphics, Polygon } from 'pixi.js'
import { EventService } from '../EventService/EventService'
import { APoint, ASubscription, CoordType, TPoints } from '../types'
import { Apartment } from '../entities/Apartment'
import { $debugConfig } from '../components/events'
import { defaultConfig } from '../Editor/defaultConfig'
import { makeLineHitbox } from '../geometryFunc'
import { EditorObject } from './EditorObject'

export class Wall extends EditorObject {
    private _drawDebug = $debugConfig.getState().drawDebug
    private _graphics = new Graphics()
    private _config = defaultConfig
    private _subscriptions: ASubscription[] = []

    public get container() { return this._graphics }

    public get apartment() { return this._apartment }

    public get points() { return this._points }

    public get globalPoints(): TPoints {
        return [
            this._graphics.toGlobal(this._points[0]),
            this._graphics.toGlobal(this._points[1])
        ]
    }

    constructor(
        _eventService: EventService,
        private _apartment: Apartment,
        private _points: TPoints
    ) {
        super(_eventService)
        const { _graphics } = this
        _graphics.eventMode = 'static'
        _graphics.cursor = 'pointer'
        this.setupEvents()
        this.render()
    }

    private setupEvents() {
        const { _graphics } = this
        _graphics.on('mouseenter', e => this.emit(e, 'mouseenter'))
        _graphics.on('mouseleave', e => this.emit(e, 'mouseleave'))
        _graphics.on('mousedown', e => this.emit(e, 'mousedown'))
        _graphics.on('mouseup', e => this.emit(e, 'mouseup'))
        this._subscriptions.push($debugConfig
            .map(x => x.drawDebug)
            .watch(x => {
                this._drawDebug = x
                this.render()
            }))
    }

    render() {
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
        _graphics.stroke({
            color: this._isHovered ? this._config.hoverStrokeColor : this._config.strokeColor,
            width: 1,
            pixelLine: true,
        })
        _graphics.hitArea = new Polygon(hitbox)
    }

    public dispose() {
        this._graphics.removeAllListeners()
        this._subscriptions.forEach(x => x.unsubscribe())
    }

    public update(points: TPoints, coordType: CoordType) {
        if (coordType === 'local') {
            this._points = points
        } else {
            this._points = [this._graphics.toLocal(points[0]), this._graphics.toLocal(points[1])]
        }
        this.render()
    }

    public updateEnd(point: APoint, coordType: CoordType) {
        if (coordType === 'local') {
            throw new Error('updateEnd is not supported for local coordinates')
        } else {
            this._points = [this.points[0], this._graphics.toLocal(point)]
        }
        this.render()
    }

    public updateStart(point: APoint, coordType: CoordType) {
        if (coordType === 'local') {
            throw new Error('updateStart is not supported for local coordinates')
        } else {
            this._points = [this._graphics.toLocal(point), this.points[1]]
        }
        this.render()
    }
}
