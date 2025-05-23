import { Container, Graphics, Polygon } from 'pixi.js'
import data from './llu.json'
import { EventService } from '../EventService/EventService'
import { EditorObject } from './EditorObject'
import { identity, pairwise, splitIntoPairs } from '../func'
import { ALine, aPoint } from '../types'
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
        _container.addChild(this._outline)
        _container.addChild(this._lines)
        _container.eventMode = 'static'
        _container.cursor = 'pointer'

        const outlinePointdata = this._data.outline.flatMap(identity)
        _container.hitArea = new Polygon(this.outlinePointdata)

        _container.on('mouseenter', e => this.emit(e, 'mouseenter'))
        _container.on('mouseleave', e => this.emit(e, 'mouseleave'))
        _container.on('mousedown', e => this.emit(e, 'mousedown'))
        _container.on('mouseup', e => this.emit(e, 'mouseup'))

        _outline.poly(outlinePointdata)

        this._data.lines.forEach(line => {
            _lines.poly(line.flatMap(identity), false)
        })
        _lines.stroke({ color: 0, width: 1, pixelLine: true })

        _outline.poly(this.outlinePointdata)
        _outline.fill({ color: 0xffffff })

        this.render()
    }

    render() {
        const { _outline, _isHovered, _isSelected } = this
        _outline.filters = [
            ...(_isHovered ? [glowFilter] : []),
            ...(_isSelected ? [outlineFilter] : []),
        ]
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