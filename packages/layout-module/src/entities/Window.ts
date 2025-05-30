import { Bounds, Container, Graphics, Text } from 'pixi.js'
import { APoint } from '../types'
import { aPoint } from '../geometryFunc'
import { EventService } from '../EventService/EventService'
import { EditorObject } from './EditorObject'
import { OutlineFilter, GlowFilter } from 'pixi-filters'
import { pointsToLines, getLineLength, interpolatePoint, projectPointOnLine, getPointDistance } from '../geometryFunc'
import { Units } from '../Units'
import { WindowDto } from '../Editor/dto'

const outlineFilter = new OutlineFilter({
    thickness: 2,
    color: 0x0066cc,
    alpha: 0.8,
})

const glowFilter = new GlowFilter({
    color: 0x0066cc,
    innerStrength: 0,
    outerStrength: 2,
    alpha: 0.5,
})

export interface WindowProperties {
    size: number
}

export const defaultWindowProperties: WindowProperties = {
    size: 900
}

export class WindowObj extends EditorObject {
    private _container = new Container()
    private _graphics = new Graphics()
    private _sizeLabel = new Text({ style: { fontSize: 8, fill: 0x333333 } })
    private _properties: WindowProperties = defaultWindowProperties

    public get container() { return this._container }
    public get isSelectable() { return true }
    public get properties() { return this._properties }
    public get globalPosition() { return this._container.getGlobalPosition() }
    public get localPosition() { return this._container.position }

    constructor(
        eventService: EventService,
        position: APoint,
        options?: {
            properties?: WindowProperties
            id?: string
        }
    ) {
        super(eventService)
        if (options?.id) this._id = options.id
        this._properties = options?.properties ? options.properties : defaultWindowProperties
        this.init(position)
    }

    private init(position: APoint) {
        const { container } = this
        container.position.copyFrom(position)
        container.addChild(this._graphics)
        container.addChild(this._sizeLabel)
        this.setupGraphics()
        this.setupLabel()
        this.render()
    }

    private setupGraphics() {
        const { _graphics } = this
        _graphics.eventMode = 'static'
        _graphics.cursor = 'pointer'
        _graphics
            .on('mouseenter', e => this.emit(e, 'mouseenter'))
            .on('mouseleave', e => this.emit(e, 'mouseleave'))
            .on('mousedown', e => this.emit(e, 'mousedown'))
            .on('mouseup', e => this.emit(e, 'mouseup'))
    }

    private setupLabel() {
        const { _sizeLabel } = this
        _sizeLabel.resolution = 2
        _sizeLabel.interactive = false
        _sizeLabel.interactiveChildren = false
        _sizeLabel.hitArea = null
        _sizeLabel.anchor.set(0.5)
        _sizeLabel.scale.set(0.5, 0.5)
    }

    public setProperties(properties: Partial<WindowProperties>) {
        this._properties = { ...this._properties, ...properties }
        this.render()
    }

    public updatePosition(point: APoint) {
        this._container.position.copyFrom(point)
        this.render()
    }

    public render() {
        const { _graphics, _sizeLabel, _isHovered, _isSelected, _container } = this

        this._graphics.filters = [
            ...(_isHovered ? [glowFilter] : []),
            ...(_isSelected ? [outlineFilter] : []),
        ]

        _graphics
            .clear()
            .circle(0, 0, 2)
            .fill({ color: this.getFillColor() })
            .circle(0, 0, 2)
            .stroke({ color: 0x333333, width: 1, pixelLine: true })

        if (_isHovered) {
            _container.addChild(_sizeLabel)
            _sizeLabel.text = `${this._properties.size}`
            _sizeLabel.position.set(0, -5)
        } else {
            _container.removeChild(_sizeLabel)
        }
    }

    public intersectFrame(frame: Bounds, _type: 'window' | 'crossing'): boolean {
        const { x, y } = this.globalPosition
        return frame.containsPoint(x, y)
    }

    public get serializable() { return true }

    public serialize(): WindowDto {
        return {
            type: 'window',
            id: this._id,
            position: aPoint(this.localPosition),
            properties: this.properties
        }
    }

    public static deserialize(eventService: EventService, dto: WindowDto): WindowObj {
        return new WindowObj(eventService, dto.position,
            { id: dto.id, properties: dto.properties })
    }

    public clone(): WindowObj {
        return new WindowObj(
            this._eventService,
            aPoint(this._container.position),
            { properties: this._properties }
        )
    }

    public createDragOutline(): Container {
        const outline = new Container()
        outline.position.copyFrom(this._container)

        const graphics = new Graphics()
        graphics
            .circle(0, 0, 2)
            .fill({ color: 0x3399cc, alpha: 0.5 })
            .circle(0, 0, 2)
            .stroke({ color: 0x3399cc, width: 1, alpha: 0.8 })

        outline.addChild(graphics)
        outline.position.copyFrom(this._container.position)
        return outline
    }

    private getFillColor() {
        return 0x3399cc
    }

    public dispose() {
        const { _graphics, _container } = this
        _graphics.removeAllListeners()
        _container.removeChildren()
    }
}

export interface WindowPlacementOptions {
    windowSize: number // размер окна в мм
    spacing: number // расстояние между окнами в мм
}

/**
 * Размещает окна вдоль контура секции
 */
export function createWindowsAlongOutline(
    outlinePoints: APoint[],
    eventService: EventService,
    options: WindowPlacementOptions
): WindowObj[] {
    const { windowSize, spacing } = options
    const windows: WindowObj[] = []

    const lines = pointsToLines(outlinePoints)

    lines.forEach(line => {
        const lineLength = Units.toMm(getLineLength(line))
        // Пропускаем слишком короткие линии
        if (lineLength < spacing) return
        // Вычисляем количество окон, которые поместятся на этой линии
        const maxWindows = Math.floor(lineLength / spacing)
        if (maxWindows === 0) return
        // Размещаем окна равномерно вдоль линии
        for (let i = 0; i < maxWindows; i++) {
            const t = (i + 1) / (maxWindows + 1) // параметр от 0 до 1
            const centerPoint = interpolatePoint(line.start, line.end, t)

            const windowProperties: WindowProperties = { size: windowSize }
            const window = new WindowObj(eventService, centerPoint, { properties: windowProperties })
            windows.push(window)
        }
    })

    return windows
}

/**
 * Находит ближайшую точку на контуре секции для привязки окна
 */
export function snapWindowToOutline(
    windowCenter: APoint,
    outlinePoints: APoint[]
): APoint {
    const lines = pointsToLines(outlinePoints)
    let closestPoint = windowCenter
    let minDistance = Infinity

    lines.forEach(line => {
        const projectedPoint = projectPointOnLine(windowCenter, line)
        const distance = getPointDistance(windowCenter, projectedPoint)

        if (distance < minDistance) {
            minDistance = distance
            closestPoint = projectedPoint
        }
    })

    return closestPoint
}