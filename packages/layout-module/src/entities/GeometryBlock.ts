import { Container, Graphics, Polygon } from 'pixi.js'
import data from './llu.json'
import { EventService } from '../EventService/EventService'
import { defaultConfig } from '../Editor/defaultConfig'
import { EditorObject } from './EditorObject'
import { identity, pairwise, splitIntoPairs } from '../func'
import { ALine, aPoint } from '../types'

export class GeometryBlock extends EditorObject {
    private _outline = new Graphics()
    private _lines = new Graphics()
    private _container = new Container()
    private _data = data
    private _config: typeof defaultConfig

    public get container() { return this._container }

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
        this._config = { ...defaultConfig }
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

        this.render()
    }

    render() {
        const { _container, _outline, _lines } = this
        _outline.clear()
        _outline.poly(this.outlinePointdata)
        _outline.fill({ color: this.getFillColor() })
    }

    private getFillColor() {
        if (this._isHovered) return this._config.hoverFillColor
        if (this._isSelected) return this._config.selectedFillColor
        return this._config.fillColor
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