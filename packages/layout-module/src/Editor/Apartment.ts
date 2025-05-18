import { Container, FederatedPointerEvent, Graphics, Text } from 'pixi.js'
import { assert, assertUnreachable, makeUuid, pairwise } from '../func'
import { getPolygonCenter, getPolygonArea, formatArea, findCircularAdjacentElements, closePolygon } from './func'
import { IDisposable, APoint, EditorObject, TPoints, CoordType, ALine } from './types'
import { EventService } from '../EventService/EventService'
import { defaultConfig } from './defaultConfig'
import { Wall } from './Wall'

export class Apartment extends EditorObject implements IDisposable {
    private _id = makeUuid()
    private _container = new Container()
    private _areaText = new Text({ style: { fontSize: 12 } })
    private _areaGraphics = new Graphics()
    private _walls: Wall[] = []
    private _state: 'normal' | 'hover' | 'selected' = 'normal'
    private _config: typeof defaultConfig

    public get id() {
        return this._id
    }

    public get container() {
        return this._container
    }

    public get points(): APoint[] {
        return this._walls.map(x => x.points[0])
    }

    public get wallLines(): ALine[] {
        return this._walls
            .map(x => x.points)
            .map(([start, end]) => ({ start, end }))
    }

    public get globalPoints() {
        return this.points.map((point) => this._container.toGlobal(point))
    }

    public get globalPosition() {
        return this.container.parent.toGlobal(this.container.position)
    }

    constructor(
        points: APoint[],
        private _eventService: EventService,
        config: Partial<typeof defaultConfig> = {}
    ) {
        super()
        this._config = { ...defaultConfig, ...config }
        this.init(points)
    }

    private init(_points: APoint[]) {
        const points = closePolygon(_points)
        this._container.addChild(this._areaText)
        this._container.addChild(this._areaGraphics)
        this.setupAreaGraphics()
        this.setupAreaText()
        this.setupWalls(points)
        this.render()
    }

    public updatePoints(points: APoint[]) {
        this._walls.forEach(wall => this._container.removeChild(wall.graphics))
        this._walls.forEach(wall => wall.dispose())
        this._walls = []
        this.init(points)
    }

    private setupWalls(points: APoint[]) {
        assert(this._walls.length === 0)
        const { _container, _eventService } = this
        this._walls = pairwise(points)
            .map(points => new Wall(_eventService, this, points))
        this._walls.forEach(wall => _container.addChild(wall.graphics))
    }

    private setupAreaGraphics() {
        const { _areaGraphics, _container } = this
        _areaGraphics.eventMode = 'static'
        _areaGraphics.cursor = 'pointer'
        _areaGraphics.on('mouseenter', e => this.mouseEnter(e))
        _areaGraphics.on('mouseleave', e => this.mouseLeave(e))
        _areaGraphics.on('mousedown', e => this.mouseDown(e))
        _areaGraphics.on('mouseup', e => this.mouseUp(e))
        _container.addChild(_areaGraphics)
    }

    private setupAreaText() {
        const { _container } = this
        const { _areaText } = this
        _areaText.resolution = 2
        _areaText.interactive = false
        _areaText.interactiveChildren = false
        _areaText.hitArea = null
        _areaText.anchor.set(0.5)
        _areaText.scale.set(0.5, 0.5)
        _container.addChild(_areaText)
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

    private mouseDown(event: FederatedPointerEvent) {
        event.stopPropagation()
        this._eventService.emit({
            type: 'mousedown',
            target: this,
            pixiEvent: event
        })
    }

    private mouseUp(event: FederatedPointerEvent) {
        event.stopPropagation()
        this._eventService.emit({
            type: 'mouseup',
            target: this,
            pixiEvent: event
        })
    }

    public updateWall(wall: Wall, newLine: TPoints, coordType: CoordType) {
        wall.update(newLine, coordType)
        const { left, right } = findCircularAdjacentElements(this._walls, wall)
        left.updateEnd(newLine[0], coordType)
        right.updateStart(newLine[1], coordType)
        this.render()
    }

    public render() {
        const { _areaGraphics, _areaText, points } = this
        _areaGraphics.clear()
        _areaGraphics.poly(this.points)
        _areaGraphics.fill({ color: this.getFillColor() })

        const center = getPolygonCenter(points)
        _areaText.text = formatArea(getPolygonArea(points))
        _areaText.position.set(center.x, center.y)
    }

    private getFillColor() {
        switch (this._state) {
            case 'normal': return this._config.fillColor
            case 'hover': return this._config.hoverFillColor
            case 'selected': return this._config.selectedFillColor
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
        const { _areaGraphics, _container, _walls } = this
        _areaGraphics.removeAllListeners()
        _container.removeChildren()
        _walls.forEach(wall => wall.dispose())
        this._walls = []
    }
}
