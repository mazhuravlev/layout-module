import type { Bounds } from 'pixi.js'
import { Container, Graphics, Matrix, Text } from 'pixi.js'
import { assert, assertUnreachable, degreesToRadians, deserializeMatrix, pairwise, serializeMatrix, withNullable } from '../func'
import * as geometryFunc from '../geometryFunc'
import type { APoint, ALine } from '../types'
import type { EventService } from '../EventService/EventService'
import { Wall } from './Wall'
import type { ApartmentProperties } from './ApartmentProperties'
import { defaultApartmentProperties } from './ApartmentProperties'
import type { ApartmentDto } from '../Editor/dto'
import { calculateApartmentType, exampleFlatmix } from '../Editor/flatMix'
import { EditorObject } from './EditorObject'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Units } from '../Units'
import { OutlineFilter, GlowFilter } from 'pixi-filters'
import * as R from 'remeda'

const outlineFilter = new OutlineFilter({
    thickness: 2,
    color: 0x000000,
    alpha: 0.5,
})

const glowFilter = new GlowFilter({
    color: 0x000000,
    innerStrength: 0,
    outerStrength: 2,
    alpha: 0.5,
})

export class Apartment extends EditorObject {
    private _container = new Container()
    private _typeLabel = new Text({ style: { fontSize: 14 } })
    private _areaLabel = new Text({ style: { fontSize: 12 } })
    private _euroLabel = new Text({ style: { fontSize: 12 } })
    private _areaGraphics = new Graphics()
    private _walls: Wall[] = []
    private _properties: ApartmentProperties = defaultApartmentProperties

    public get container() { return this._container }

    public get isSelectable() { return true }

    /**
     * Точки в локальных координатах
     */
    public get points(): APoint[] {
        return this._walls.map(x => x.line.start)
    }

    public get position() { return this.container.position }

    public get transform() { return this.container.localTransform }

    /** 
     * Стены в локальных координатах
     */
    public get wallLines(): ALine[] {
        return this._walls
            .map(x => x.line)
    }

    public get walls(): Readonly<Wall[]> {
        return this._walls
    }

    public get globalPoints() {
        return this.points.map((point) => this._container.toGlobal(point))
    }

    public get globalPosition() {
        return this.container.parent.toGlobal(this.container.position)
    }

    public get properties(): ApartmentProperties { return this._properties }

    public get serializable() { return true }

    /**
     * 
     * @param _points Координаты точек во внутренних координатах {@link Units}
     * @param eventService 
     * @param config 
     */
    constructor(
        eventService: EventService,
        points: APoint[],
        options?: {
            id?: string
            transform?: Matrix
            properties?: ApartmentProperties
        },
    ) {
        super(eventService)
        withNullable(options?.id, id => this._id = id)
        withNullable(options?.transform, t => this._container.setFromMatrix(t))
        withNullable(options?.properties, properties => this._properties = properties)
        this.init(geometryFunc.ensureClockwisePolygon(points))
    }

    public setProperties(properties: Partial<ApartmentProperties>) {
        this._properties = { ...this._properties, ...properties }
        this.render()
    }

    public rotate(angle: number) {
        const center = this.getCenter()
        this.applyMatrix(
            new Matrix()
                .translate(-center.x, -center.y)
                .rotate(degreesToRadians(angle))
                .translate(center.x, center.y))
    }

    public flip(type: 'horizontal' | 'vertical') {
        const center = this.getCenter()
        const scaleFactor = type === 'vertical' ? -1 : 1
        this.applyMatrix(
            new Matrix()
                .translate(-center.x, -center.y)
                .scale(-1 * scaleFactor, 1 * scaleFactor)
                .translate(center.x, center.y))
    }

    private applyMatrix(matrix: Matrix) {
        this.updatePoints(
            geometryFunc.ensureClockwisePolygon(
                this.points.map(point => matrix.apply(point))))
        this.render()
    }

    private init(points: APoint[]) {
        this._container.addChild(this._areaLabel)
        this._container.addChild(this._areaGraphics)
        this.setupAreaGraphics()
        this.setupLabels()
        this.setupWalls(
            R.pipe(
                points,
                geometryFunc.closePolygon,
                geometryFunc.filterZeroLengthWalls,
                geometryFunc.joinCollinearWalls))
        this.render()
    }

    public updatePoints(points: APoint[]) {
        this._walls.forEach(wall => this._container.removeChild(wall.container))
        this._walls.forEach(wall => wall.dispose())
        this._walls = []
        this._areaGraphics.clear()
        this._areaGraphics.removeAllListeners()
        this.init(points)
    }

    public updatePosition(point: APoint) {
        this._container.position.copyFrom(point)
        this.render()
    }

    public serialize(): ApartmentDto {
        return {
            type: 'apartment',
            id: this._id,
            points: this.points,
            transform: serializeMatrix(this.transform),
            properties: this._properties,
        }
    }

    public static deserialize(eventService: EventService, dto: ApartmentDto) {
        return new Apartment(
            eventService,
            dto.points,
            {
                id: dto.id,
                transform: deserializeMatrix(dto.transform),
                properties: dto.properties,
            })
    }

    private setupWalls(points: APoint[]) {
        assert(this._walls.length === 0)
        const { _container, _eventService } = this
        this._walls = pairwise(points)
            .map(([start, end]) => new Wall(_eventService, this, { start, end }))
        this._walls.forEach(wall => _container.addChild(wall.container))
    }

    private setupAreaGraphics() {
        const { _areaGraphics, _container } = this
        _areaGraphics.eventMode = 'static'
        _areaGraphics.cursor = 'pointer'
        _areaGraphics.on('mouseenter', e => this.emit(e, 'mouseenter'))
        _areaGraphics.on('mouseleave', e => this.emit(e, 'mouseleave'))
        _areaGraphics.on('mousedown', e => this.emit(e, 'mousedown'))
        _areaGraphics.on('mouseup', e => this.emit(e, 'mouseup'))
        _container.addChild(_areaGraphics)
    }

    private setupLabels() {
        const { _container, _areaLabel, _typeLabel, _euroLabel } = this

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


        _euroLabel.resolution = 2
        _euroLabel.interactive = false
        _euroLabel.interactiveChildren = false
        _euroLabel.hitArea = null
        _euroLabel.anchor.set(0.5)
        _euroLabel.scale.set(0.5, 0.5)
        _container.addChild(_euroLabel)
    }

    /**
     * 
     * @param wall 
     * @param newLine в глобальных координатах
     */
    public updateWall(wall: Wall, newLine: ALine) {
        wall.update(newLine)
        const { left, right } = geometryFunc.findCircularAdjacentElements(this._walls, wall)
        left.updateEnd(newLine.start)
        right.updateStart(newLine.end)
        this.render()
    }

    public calculateArea() {
        const area = geometryFunc.getPolygonArea(this.points)
        return area / 100
    }

    render() {
        const { _areaGraphics, _areaLabel, _typeLabel, _euroLabel, _isHovered, _isSelected } = this

        this._areaGraphics.filters = [
            ...(_isHovered ? [glowFilter] : []),
            ...(_isSelected ? [outlineFilter] : []),
        ]

        _areaGraphics
            .clear()
            .poly(this.points)
            .fill({ color: this.getFillColor() })

        const center = this.getCenter()
        const area = this.calculateArea()
        _areaLabel.text = `${Math.round(area)} м²`
        _areaLabel.position.set(center.x, center.y)
        const flatmixType = calculateApartmentType(exampleFlatmix, {
            area,
            bedroomCount: this._properties.bedroomCount,
            isEuro: this._properties.isEuro,
        })
        _typeLabel.text = `${this.properties.bedroomCount}${flatmixType}`
        _typeLabel.position.set(center.x, center.y - 8)
        _euroLabel.text = `${this.properties.isEuro ? 'Евро' : 'Стандарт'}`
        _euroLabel.position.set(center.x, center.y + 8)
    }

    public createDragOutline(): Container {
        const outline = new Container()
        outline.position.copyFrom(this._container.position)
        const graphics = new Graphics()
        graphics
            .poly(this.points)
            .stroke({ color: 0x666666, pixelLine: true, alpha: 0.6 })
        outline.addChild(graphics)
        return outline
    }

    private getCenter() {
        return geometryFunc.getPolygonCenter(this.points)
    }

    private getFillColor() {
        switch (this._properties.bedroomCount) {
            case 0: return 0xf2c6c6
            case 1: return 0x7eaff0
            case 2: return 0xfbefc9
            case 3: return 0xa9e2c1
            default: return 0xFFFFFF
        }
    }

    public intersectFrame(frame: Bounds, type: 'window' | 'crossing'): boolean {
        const p = ({ x, y }: APoint) => frame.containsPoint(x, y)
        switch (type) {
            case 'crossing': return this.globalPoints.some(p)
            case 'window': return this.globalPoints.every(p)
            default: throw assertUnreachable(type)
        }
    }

    public dispose() {
        const { _areaGraphics, _container, _walls } = this
        _areaGraphics.removeAllListeners()
        _container.removeChildren()
        _walls.forEach(wall => wall.dispose())
        this._walls = []
    }
}
