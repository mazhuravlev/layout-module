import { Container, Graphics } from 'pixi.js'
import { APoint } from '../types'
import { drawOutline } from '../geometryFunc'
import { offsetPolygon } from '../func'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Units } from '../Units'

export class SectionOutline {
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
        const { _graphics, _points, _offsetGraphics, _offset } = this
        drawOutline(_graphics, _points, undefined, { color: 0xaaaaaa })
        drawOutline(_offsetGraphics, this.offsetPoints)
    }

    /**
     * @param offset Офсет во внутренних единицах измерения {@link Units}
     */
    public setOffset(offset: number) {
        this._offset = offset
        this.render()
    }
}