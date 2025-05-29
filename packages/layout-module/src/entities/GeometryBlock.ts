import { Container, Graphics, Polygon } from 'pixi.js'
import data from './llu.json'
import { EventService } from '../EventService/EventService'
import { EditorObject } from './EditorObject'
import { identity, pairwise, splitIntoPairs } from '../func'
import { ALine, APoint, aPoint, NotImplemented } from '../types'
import { OutlineFilter, GlowFilter } from 'pixi-filters'

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
    private _data = data

    public get container() { return this._container }

    public get isSelectable() { return true }

    public get globalPoints() {
        return splitIntoPairs(this.outlinePointdata).map((point) => this._container.toGlobal(aPoint(point)))
    }

    public get globalLines(): ALine[] {
        const globalPoints = this.globalPoints
        return pairwise(globalPoints).map(([start, end]) => ({ start, end }))
    }

    private get outlinePointdata() { return this._data.outline.flatMap(identity) }

    constructor(
        _eventService: EventService,
    ) {
        super(_eventService)
        this.init()
    }

    private init() {
        const { _container, _outline, _lines } = this
        _container.eventMode = 'static'
        _container.cursor = 'pointer'
        _container.hitArea = new Polygon(this.outlinePointdata)
        _container
            .on('mouseenter', e => this.emit(e, 'mouseenter'))
            .on('mouseleave', e => this.emit(e, 'mouseleave'))
            .on('mousedown', e => this.emit(e, 'mousedown'))
            .on('mouseup', e => this.emit(e, 'mouseup'))


        this._data.lines.forEach(line => {
            _lines.poly(line.flatMap(identity), false)
        })
        _lines.stroke({ color: 0, width: 1, pixelLine: true })
        _container.addChild(_lines)

        _outline
            .poly(this.outlinePointdata)
            .fill({ color: 0xffffff })
        _container.addChild(_outline)

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
            .poly(this.outlinePointdata)
            .stroke({ color: 0x666666, pixelLine: true, alpha: 0.6 })
        outline.addChild(graphics)
        return outline
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