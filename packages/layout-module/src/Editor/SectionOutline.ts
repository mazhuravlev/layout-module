import { Container, Graphics } from 'pixi.js'
import { APoint, IDisposable } from '../types'
import { mapPoint } from '../geometryFunc'
import { offsetPolygon } from '../geometryFunc'

import { Units } from '../Units'
import { SectionOutlineDto } from './SectionOutlineDto'

export class SectionOutline implements IDisposable {
    private _container = new Container()
    private _graphics = new Graphics()
    private _offsetGraphics = new Graphics()

    public get container() { return this._container }

    public get globalPoints(): APoint[] {
        return this.offsetPoints.map(x => this._graphics.toGlobal(x))
    }

    public get offsetPoints() {
        return offsetPolygon(this._points, -1 * this._offset)
    }

    public get points() {
        return this._points
    }

    /**
     * @param _points Координаты точек во внутренних единицах измерения {@link Units}
     * @param _offset 
     */
    constructor(
        private _points: APoint[],
        private _offset: number
    ) {
        const { _container, _graphics, _offsetGraphics } = this
        _container.addChild(_graphics)
        _container.addChild(_offsetGraphics)

        this.render()
    }

    private render() {
        const { _graphics, _points, _offsetGraphics, offsetPoints } = this
        _graphics
            .poly(_points)
            .stroke({ color: 0xaaaaaa, pixelLine: true })
        _offsetGraphics
            .poly(offsetPoints)
            .stroke({ color: 0, pixelLine: true })
    }

    /**
     * @param offset Офсет во внутренних единицах измерения {@link Units}
     */
    public setOffset(offset: number) {
        this._offset = offset
        this.render()
    }

    public serialize(): SectionOutlineDto {
        return {
            type: 'sectionOutline',
            points: this._points.map(mapPoint(Units.toMm)),
            offset: Units.toMm(this._offset)
        }
    }

    public static deserialize(dto: SectionOutlineDto): SectionOutline {
        return new SectionOutline(dto.points, dto.offset)
    }

    public dispose() {
        this._container.destroy({ children: true })
    }
}
