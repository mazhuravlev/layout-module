import { Container, Graphics, Matrix, Polygon } from 'pixi.js'
import { EventService } from '../../EventService/EventService'
import { EditorObject } from '../EditorObject'
import { degreesToRadians, pairwise } from '../../func'
import { ALine, APoint, NotImplemented } from '../../types'
import { OutlineFilter, GlowFilter } from 'pixi-filters'
import { GeometryBlockData } from './GeometryBlockData'
import { getPolygonCenter } from '../../geometryFunc'

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

    public get globalPoints() {
        return this._data.outline.map((point) => this._container.toGlobal(point))
    }

    public get globalLines(): ALine[] {
        const globalPoints = this.globalPoints
        return pairwise(globalPoints).map(([start, end]) => ({ start, end }))
    }

    constructor(
        _eventService: EventService,
        private _data: GeometryBlockData,
    ) {
        super(_eventService)
        this.init()
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
        return outline
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
        const { _container } = this
        const currentMatrix = _container.localTransform
        currentMatrix.append(matrix)
        _container.setFromMatrix(currentMatrix)
    }

    private getCenter(): APoint {
        return getPolygonCenter(this._data.outline)
    }

    public updatePosition(point: APoint) {
        this._container.position.copyFrom(point)
        this.render()
    }

    public clone(): GeometryBlock {
        throw new NotImplemented()
    }

    public dispose(): void {
        this._container.removeAllListeners()
        this._container.removeChildren()
        this._container.destroy()

        this._outline.removeAllListeners()
        this._outline.destroy()

        this._lines.removeAllListeners()
        this._lines.destroy()
    }
}