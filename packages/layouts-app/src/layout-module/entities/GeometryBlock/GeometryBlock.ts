import type { Bounds} from 'pixi.js'
import { Container, Graphics, Matrix, Polygon } from 'pixi.js'
import type { EventService } from '../../EventService/EventService'
import { EditorObject } from '../EditorObject'
import { assertUnreachable, degreesToRadians, deserializeMatrix, pairwise, serializeMatrix, withNullable } from '../../func'
import type { ALine, APoint } from '../../types'
import { OutlineFilter, GlowFilter } from 'pixi-filters'
import type { GeometryBlockData } from './GeometryBlockData'
import { getPolygonCenter } from '../../geometryFunc'
import type { GeometryBlockDto } from '../../Editor/dto'

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

export class GeometryBlock extends EditorObject {
    private _outline = new Graphics()
    private _lines = new Graphics()
    private _container = new Container()

    public get container() { return this._container }

    public get isSelectable() { return true }

    public get position() { return this.container.position }

    public get transform() { return this.container.localTransform }

    public get globalPosition() {
        return this.container.parent.toGlobal(this.container.position)
    }

    public get globalPoints() {
        return this._data.outline.map((point) => this._container.toGlobal(point))
    }

    public get globalLines(): ALine[] {
        const globalPoints = this.globalPoints
        return pairwise(globalPoints).map(([start, end]) => ({ start, end }))
    }

    public get data(): GeometryBlockData {
        return this._data
    }

    constructor(
        _eventService: EventService,
        private _data: GeometryBlockData,
        options?: {
            id?: string
            transform?: Matrix
        }
    ) {
        super(_eventService)
        withNullable(options?.id, id => this._id = id)
        withNullable(options?.transform, t => this._container.setFromMatrix(t))
        this.init()
    }

    public get serializable() { return true }

    public serialize(): GeometryBlockDto {
        return {
            type: 'geometryBlock',
            id: this._id,
            data: this._data,
            transform: serializeMatrix(this.transform),
        }
    }

    public static deserialize(eventService: EventService, dto: GeometryBlockDto): GeometryBlock {
        return new GeometryBlock(eventService, dto.data, {
            id: dto.id,
            transform: deserializeMatrix(dto.transform),
        })
    }

    private init() {
        const { _container, _outline, _lines } = this
        _container.eventMode = 'static'
        _container.cursor = 'pointer'
        _container.hitArea = new Polygon(this._data.outline)
        _container
            .on('mouseenter', e => this.emit(e, 'mouseenter'))
            .on('mouseleave', e => this.emit(e, 'mouseleave'))
            .on('mousedown', e => this.emit(e, 'mousedown'))
            .on('mouseup', e => this.emit(e, 'mouseup'))

        _outline
            .poly(this._data.outline)
            .fill({ color: 0xffffff })
        _container.addChild(_outline)

        this._data.geometry.forEach(line => {
            _lines.poly(line, false)
        })
        _lines.stroke({ color: 0, width: 1, pixelLine: true })
        _container.addChild(_lines)

        this.render()
    }

    render() {
        const { _outline, _isHovered, _isSelected } = this
        _outline.filters = [
            ...(_isHovered ? [glowFilter] : []),
            ...(_isSelected ? [outlineFilter] : []),
        ]
    }

    public createDragOutline(): Container {
        const outline = new Container()
        const graphics = new Graphics()
        graphics
            .poly(this._data.outline)
            .stroke({ color: 0x666666, pixelLine: true, alpha: 0.6 })
        outline.addChild(graphics)
        outline.setFromMatrix(this.transform)
        return outline
    }

    public rotate(angle: number) {
        const { x, y } = this.getCenter()
        this.applyMatrix(
            new Matrix()
                .translate(-x, -y)
                .rotate(degreesToRadians(angle))
                .translate(x, y))
    }

    public flip(type: 'horizontal' | 'vertical') {
        const { x, y } = this.getCenter()
        const scaleFactor = type === 'vertical' ? -1 : 1
        this.applyMatrix(
            new Matrix()
                .translate(-x, -y)
                .scale(-1 * scaleFactor, 1 * scaleFactor)
                .translate(x, y))
    }

    private applyMatrix(matrix: Matrix) {
        this.transform.append(matrix)
        this._container.setFromMatrix(this.transform)
    }

    private getCenter(): APoint {
        return getPolygonCenter(this._data.outline)
    }

    public updatePosition(point: APoint) {
        this._container.position.copyFrom(point)
        this.render()
    }

    public intersectFrame(frame: Bounds, type: 'window' | 'crossing'): boolean {
        const p = ({ x, y }: APoint) => frame.containsPoint(x, y)
        switch (type) {
            case 'crossing': return this.globalPoints.some(p)
            case 'window': return this.globalPoints.every(p)
            default: throw assertUnreachable(type)
        }
    }

    public clone(): GeometryBlock {
        return new GeometryBlock(
            this._eventService,
            this._data,
            { transform: this.transform.clone() })
    }

    public dispose(): void {
        this._container
            .removeAllListeners()
            .destroy()

        this._outline
            .removeAllListeners()
            .destroy()

        this._lines
            .removeAllListeners()
            .destroy()
    }
}