import { Container, Graphics, Polygon, Text } from 'pixi.js'
import { EventService } from '../EventService/EventService'
import { APoint, ASubscription, CoordType, TPoints, unsubscribe } from '../types'
import { Apartment } from '../entities/Apartment'
import { $debugConfig, $sizeConfig } from '../components/events'
import { isVerticalLine, lineCenter, lineLength, makeLineHitbox, shiftLine } from '../geometryFunc'
import { EditorObject } from './EditorObject'
import { GlowFilter } from 'pixi-filters'

const wallSettings = {
    size: {
        fontSize: 10,
        fontColor: 0x660000,
        offset: 4,
    }
}

const glowFilter = new GlowFilter({
    distance: 10,
    outerStrength: 2,
    color: 0x00FF00,
})

export class Wall extends EditorObject {
    private _drawDebug = $debugConfig.getState().drawDebug
    private _container = new Container()
    private _graphics = new Graphics()
    private _sizeText = new Text({ resolution: 2, style: { fontSize: wallSettings.size.fontSize, fill: wallSettings.size.fontColor } })
    private _subscriptions: ASubscription[] = []
    private _showSize: boolean = true

    public get container() { return this._container }

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
        this._subscriptions.push($sizeConfig
            .map(x => x.showWallSize)
            .watch(x => {
                this._showSize = x
                this.render()
            }))
        const { _graphics, _container, _sizeText } = this
        _sizeText.anchor.set(0.5)
        _sizeText.scale.set(0.5)
        _container.addChild(_sizeText)
        _container.addChild(_graphics)
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
        const hitbox = makeLineHitbox(p1, p2, HITBOX_WIDTH, 0)
        _graphics.clear()
        if (this._drawDebug) {
            _graphics.poly(hitbox)
            _graphics.fill({ color: 0xaaffaa, alpha: 0.5 })
        }
        _graphics.moveTo(p1.x, p1.y)
        _graphics.lineTo(p2.x, p2.y)
        _graphics.stroke({
            color: 0,
            width: 1,
            pixelLine: true,
        })
        _graphics.filters = this._isHovered ? [glowFilter] : []
        _graphics.hitArea = new Polygon(hitbox)
        const { _sizeText } = this
        if (this._showSize) {
            this._container.addChild(_sizeText)
            const sizePos = lineCenter(shiftLine(this._points, wallSettings.size.offset))
            _sizeText.position.set(sizePos.x, sizePos.y)
            _sizeText.text = (lineLength(this._points) * 100).toFixed(0)
            switch (isVerticalLine(this._points)) {
                case 1:
                    _sizeText.angle = 90
                    break
                case -1:
                    _sizeText.angle = -90
                    break
            }
        } else {
            this._container.removeChild(_sizeText)
        }
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
