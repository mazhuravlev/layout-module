import { Container, Graphics, Text } from 'pixi.js'
import { assert, makeUuid, pairwise } from '../func'
import { getPolygonCenter, getPolygonArea, formatArea, findCircularAdjacentElements, closePolygon } from '../geometryFunc'
import { APoint, TPoints, CoordType, ALine } from '../types'
import { EventService } from '../EventService/EventService'
import { defaultConfig } from '../Editor/defaultConfig'
import { Wall } from './Wall'
import { ApartmentProperties, defaultApartmentProperties } from './ApartmentProperties'
import { ApartmentDto } from './ApartmentDto'
import { calculateApartmentType, exampleFlatmix } from '../Editor/flatMix'
import { EditorObject } from './EditorObject'

export class Apartment extends EditorObject {
    private _id = makeUuid()
    private _container = new Container()
    private _typeLabel = new Text({ style: { fontSize: 14 } })
    private _areaLabel = new Text({ style: { fontSize: 12 } })
    private _areaGraphics = new Graphics()
    private _walls: Wall[] = []
    private _config: typeof defaultConfig
    private _properties: ApartmentProperties = defaultApartmentProperties

    public get id() { return this._id }

    public get container() { return this._container }

    public get points(): APoint[] {
        return this._walls.map(x => x.points[0])
    }

    public get position() { return this.container.position }

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

    public get properties() { return this._properties }

    public set properties(properties: ApartmentProperties) {
        this._properties = properties
    }

    public get dto(): ApartmentDto {
        return {
            id: this._id,
            points: this.points,
            position: this.position,
            properties: this._properties
        }
    }

    constructor(
        points: APoint[],
        _eventService: EventService,
        config: Partial<typeof defaultConfig> = {}
    ) {
        super(_eventService)
        this._config = { ...defaultConfig, ...config }
        this.init(points)
    }

    private init(_points: APoint[]) {
        const points = closePolygon(_points)
        this._container.addChild(this._areaLabel)
        this._container.addChild(this._areaGraphics)
        this.setupAreaGraphics()
        this.setupLabels()
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
        _areaGraphics.cursor = 'move'
        _areaGraphics.on('mouseenter', e => this.emit(e, 'mouseenter'))
        _areaGraphics.on('mouseleave', e => this.emit(e, 'mouseleave'))
        _areaGraphics.on('mousedown', e => this.emit(e, 'mousedown'))
        _areaGraphics.on('mouseup', e => this.emit(e, 'mouseup'))
        _container.addChild(_areaGraphics)
    }

    private setupLabels() {
        const { _container, _areaLabel, _typeLabel } = this

        _areaLabel.resolution = 2
        _areaLabel.interactive = false
        _areaLabel.interactiveChildren = false
        _areaLabel.hitArea = null
        _areaLabel.anchor.set(0.5)
        _areaLabel.scale.set(0.5, 0.5)
        _container.addChild(_areaLabel)

        _typeLabel.resolution = 2
        _typeLabel.interactive = false
        _typeLabel.interactiveChildren = false
        _typeLabel.hitArea = null
        _typeLabel.anchor.set(0.5)
        _typeLabel.scale.set(0.5, 0.5)
        _container.addChild(_typeLabel)
    }

    public updateWall(wall: Wall, newLine: TPoints, coordType: CoordType) {
        wall.update(newLine, coordType)
        const { left, right } = findCircularAdjacentElements(this._walls, wall)
        left.updateEnd(newLine[0], coordType)
        right.updateStart(newLine[1], coordType)
        this.render()
    }

    public calculateArea() {
        const area = getPolygonArea(this.points)
        return area / 100
    }

    render() {
        const { _areaGraphics, _areaLabel, _typeLabel, points } = this
        _areaGraphics.clear()
        _areaGraphics.poly(this.points)
        _areaGraphics.fill({ color: this.getFillColor() })

        const center = getPolygonCenter(points)
        const area = this.calculateArea()
        _areaLabel.text = formatArea(area)
        _areaLabel.position.set(center.x, center.y)
        const flatmixType = calculateApartmentType(exampleFlatmix, {
            area,
            bedroomCount: this._properties.bedroomCount,
            isEuro: this._properties.isEuro
        })
        _typeLabel.text = `${this.properties.bedroomCount}${flatmixType}`
        _typeLabel.position.set(center.x, center.y - 10)
    }

    private getFillColor() {
        if (this._isHovered) return this._config.hoverFillColor
        if (this._isSelected) return this._config.selectedFillColor
        return this._config.fillColor
    }

    public dispose() {
        const { _areaGraphics, _container, _walls } = this
        _areaGraphics.removeAllListeners()
        _container.removeChildren()
        _walls.forEach(wall => wall.dispose())
        this._walls = []
    }
}
