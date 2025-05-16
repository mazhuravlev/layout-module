import { Container, Graphics } from 'pixi.js'
import { APoint, ALine, IDisposable, TPoints } from './types'
import { $debugConfig, $snapConfig, fromEffectorStore } from '../components/events'
import { Subscription } from 'rxjs'
import { identity } from '../func'

const emptyResult = { snapped: false } as const

type SnapResult =
    | { snapped: false }
    | {
        snapped: true
        dx: number
        dy: number
        snapPoint: APoint
        originalPoint: APoint
    }

export class SnapService implements IDisposable {
    private _drawDebug = $debugConfig.getState().drawDebug
    private _subscriptions: Subscription[] = []
    private _config: ReturnType<typeof $snapConfig.getState>
    private _snapIndicator: Graphics | null = null

    constructor(
        private _stage: Container,
        private _staticPoints: APoint[],
        private _staticWalls: ALine[],
    ) {
        this._config = $snapConfig.getState()
        this._subscriptions.push(fromEffectorStore($debugConfig, x => x.drawDebug).subscribe(x => this._drawDebug = x))
        this._subscriptions.push(fromEffectorStore($snapConfig, identity).subscribe(x => this._config = x))
    }

    /**
     * Проверяет привязку точки к статическим элементам
     */
    checkPointSnap(point: APoint): SnapResult {
        if (!this._config.enablePoint) return emptyResult

        // 1. Проверка привязки к точкам
        const pointSnap = this.checkPointToPoint(point)
        if (pointSnap.snapped) return pointSnap

        // 2. Проверка привязки к линиям
        const lineSnap = this.checkPointToLine(point)
        if (lineSnap.snapped) return lineSnap

        return emptyResult
    }

    /**
     * Проверяет привязку линии к статическим элементам
     */
    public checkWallSnap([start, end]: TPoints): SnapResult {
        if (!this._config.enable) return emptyResult
        // Проверяем оба конца линии
        const startSnap = this.checkPointSnap(start)
        const endSnap = this.checkPointSnap(end)

        if (startSnap.snapped && endSnap.snapped) {
            // Если оба конца привязаны, выбираем более близкую привязку
            const startDist = Math.hypot(startSnap.dx!, startSnap.dy!)
            const endDist = Math.hypot(endSnap.dx!, endSnap.dy!)

            return startDist < endDist ? startSnap : endSnap
        }

        return startSnap.snapped ? startSnap : endSnap
    }

    /**
     * Проверяет привязку всей квартиры (всех точек)
     */
    public checkOutlineSnap(points: APoint[]): SnapResult {
        if (!this._config.enable) return emptyResult
        for (const point of points) {
            const result = this.checkPointSnap(point)
            if (result.snapped) {
                return result
            }
        }
        return emptyResult
    }

    private checkPointToPoint(point: APoint): SnapResult {
        let minDistance = Infinity
        let result: SnapResult = emptyResult

        for (const staticPoint of this._staticPoints) {
            const dx = staticPoint.x - point.x
            const dy = staticPoint.y - point.y
            const distance = Math.hypot(dx, dy)

            if (distance < this._config.pointThreshold! && distance < minDistance) {
                minDistance = distance
                result = {
                    snapped: true,
                    dx,
                    dy,
                    snapPoint: staticPoint,
                    originalPoint: point,
                }
            }
        }

        return result
    }

    private checkPointToLine(point: APoint): SnapResult {
        if (!this._config.enableLine) return emptyResult
        let minDistance = Infinity
        let result: SnapResult = emptyResult

        for (const wall of this._staticWalls) {
            const projected = this.projectPointToLine(point, wall)
            const dx = projected.x - point.x
            const dy = projected.y - point.y
            const distance = Math.hypot(dx, dy)

            if (distance < this._config.lineThreshold! && distance < minDistance) {
                minDistance = distance
                result = {
                    snapped: true,
                    dx,
                    dy,
                    snapPoint: projected,
                    originalPoint: point,
                }
            }
        }

        return result
    }

    private projectPointToLine(point: APoint, line: ALine): APoint {
        const { start, end } = line
        const l2 = (end.x - start.x) ** 2 + (end.y - start.y) ** 2
        let t = ((point.x - start.x) * (end.x - start.x) +
            (point.y - start.y) * (end.y - start.y)) / l2
        t = Math.max(0, Math.min(1, t))

        return {
            x: start.x + t * (end.x - start.x),
            y: start.y + t * (end.y - start.y)
        }
    }

    /**
     * Визуализация точки привязки (для отладки)
     */
    public showSnapIndicator(point: APoint) {
        if (!this._drawDebug) return

        if (!this._snapIndicator) {
            this._snapIndicator = new Graphics()
            this._stage.addChild(this._snapIndicator)
        }
        const { x, y } = this._stage.toLocal(point)
        this._snapIndicator.clear()
        this._snapIndicator.beginFill(0xFF0000, 0.5)
        this._snapIndicator.drawCircle(x, y, 5)
        this._snapIndicator.endFill()
    }

    public hideSnapIndicator() {
        if (this._snapIndicator) {
            this._snapIndicator.clear()
        }
    }

    public dispose() {
        if (this._snapIndicator) {
            this._snapIndicator.destroy()
            this._snapIndicator = null
        }
        this._subscriptions.forEach(x => x.unsubscribe())
    }
}