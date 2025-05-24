import { Container, Graphics } from 'pixi.js'
import { APoint, ALine, IDisposable, TPoints, ASubscription } from '../types'
import { $debugConfig, $snapConfig, SnapConfig } from '../components/events'
import { areLinesCollinear, getSlope, pointsToLines } from '../geometryFunc'
import { Units } from '../Units'
import { assertUnreachable, not } from '../func'

const emptyResult = { snapped: false } as const

type SnapResult =
    | { snapped: false }
    | {
        snapped: 'point'
        dx: number
        dy: number
        snapPoint: APoint
        originalPoint: APoint
    }
    | {
        snapped: 'line'
        dx: number
        dy: number
        snapPoint: APoint
        originalPoint: APoint
        k: number | null
    }

const snapIndicatorColor = 0xee0000

export class SnapService implements IDisposable {
    private _drawDebug = $debugConfig.getState().drawDebug
    private _subscriptions: ASubscription[] = []
    private _config: SnapConfig
    private _snapIndicator = new Graphics()
    private _disposed = false

    constructor(
        private _stage: Container,
        private _staticPoints: APoint[],
        private _staticLines: ALine[],
    ) {
        _stage.addChild(this._snapIndicator)
        this._config = $snapConfig.getState()
        this._subscriptions.push($debugConfig.watch(x => this._drawDebug = x.drawDebug))
        this._subscriptions.push($snapConfig.watch(x => this._config = x))
    }

    /**
     * Проверяет привязку точки к статическим элементам
     */
    public checkPointSnap(point: APoint): SnapResult {
        if (this._disposed) return emptyResult
        if (!this._config.enable) return emptyResult

        // 1. Проверка привязки к сетке (имеет приоритет)
        // if (this._config.enableGrid) {
        //     const gridSnap = this.checkPointToGrid(point)
        //     if (gridSnap.snapped) return gridSnap
        // }

        // 2. Проверка привязки к точкам
        if (this._config.enablePoint) {
            const pointSnap = this.checkPointToPoint(point)
            if (pointSnap.snapped) return pointSnap
        }

        // 3. Проверка привязки к линиям
        if (this._config.enableLine) {
            const lineSnap = this.checkPointToLine(point)
            if (lineSnap.snapped) return lineSnap
        }

        return emptyResult
    }

    public applyGridSnap(distance: number) {
        if (this._disposed) return distance
        if (!this._config.enable) return distance
        if (!this._config.enableGrid) return distance
        const zoom = this._stage.scale.x
        const gridStep = Units.fromMm(this._config.gridStep) * zoom
        const result = Math.round(distance / gridStep) * gridStep
        return result
    }

    /**
     * Проверяет привязку линии к статическим элементам
     */
    public checkLineSnap([start, end]: TPoints): SnapResult {
        if (this._disposed) return emptyResult
        if (not(this._config.enable)) return emptyResult

        // 3. Проверка привязки к статическим линиям (коллинеарность)
        if (this._config.enableLine) {
            for (const staticLine of this._staticLines) {
                const { start: sStart, end: sEnd } = staticLine

                // Проверяем коллинеарность линий
                const areCollinear = areLinesCollinear(
                    { start, end },
                    { start: sStart, end: sEnd }
                )

                if (areCollinear) {
                    // Проецируем оба конца линии на статическую линию
                    const projectedStart = this.projectPointToLine(start, staticLine)
                    const projectedEnd = this.projectPointToLine(end, staticLine)

                    // Проверяем расстояние от исходных точек до проекций
                    const startDist = Math.hypot(projectedStart.x - start.x, projectedStart.y - start.y)
                    const endDist = Math.hypot(projectedEnd.x - end.x, projectedEnd.y - end.y)

                    if (startDist < this._config.lineThreshold! || endDist < this._config.lineThreshold!) {
                        // Выбираем точку с минимальным расстоянием
                        if (startDist <= endDist && startDist < this._config.lineThreshold!) {
                            return {
                                snapped: 'line',
                                dx: projectedStart.x - start.x,
                                dy: projectedStart.y - start.y,
                                snapPoint: projectedStart,
                                originalPoint: start,
                                k: getSlope(start, end),
                            }
                        } else if (endDist < this._config.lineThreshold!) {
                            return {
                                snapped: 'line',
                                dx: projectedEnd.x - end.x,
                                dy: projectedEnd.y - end.y,
                                snapPoint: projectedEnd,
                                originalPoint: end,
                                k: getSlope(start, end),
                            }
                        }
                    }
                }
            }
        }

        return emptyResult
    }

    /**
     * Проверяет привязку всей квартиры (всех точек)
     */
    public checkOutlineSnap(points: APoint[]): SnapResult {
        if (this._disposed) return emptyResult
        if (!this._config.enable) return emptyResult

        if (this._config.enablePoint) {
            for (const point of points) {
                const result = this.checkPointSnap(point)
                if (result.snapped) {
                    return result
                }
            }
        }

        if (this._config.enableLine) {
            const lines = pointsToLines(points)
            for (const { start, end } of lines) {
                const result = this.checkLineSnap([start, end])
                if (result.snapped) return result
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
                    snapped: 'point',
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

        for (const line of this._staticLines) {
            const projected = this.projectPointToLine(point, line)
            const dx = projected.x - point.x
            const dy = projected.y - point.y
            const distance = Math.hypot(dx, dy)

            if (distance < this._config.lineThreshold! && distance < minDistance) {
                minDistance = distance
                result = {
                    snapped: 'line',
                    dx,
                    dy,
                    snapPoint: projected,
                    originalPoint: point,
                    k: getSlope(line.start, line.end),
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
     * Визуализация привязки
     */
    public showSnapIndicator(snapResult: SnapResult) {
        if (this._disposed) return
        if (not(this._config.enable)) return

        switch (snapResult.snapped) {
            case 'line':
                this.showLineSnapIndicator(snapResult)
                break
            case 'point':
                this.showPointSnapIndicator(snapResult.snapPoint)
                break
            case false:
                this._snapIndicator.clear()
                break
            default:
                assertUnreachable(snapResult)
        }
    }

    private showLineSnapIndicator(snapResult: SnapResult) {
        if (snapResult.snapped === 'line') {
            const { x, y } = this._stage.toLocal(snapResult.snapPoint)
            const g = this._snapIndicator
            g.clear()
            const { k } = snapResult
            const lineLength = 1000
            if (k === null || !isFinite(k)) {
                g.moveTo(x, y - lineLength)
                g.lineTo(x, y + lineLength)
            } else {
                const dx = lineLength / Math.sqrt(1 + k * k)
                const dy = k * dx
                g.moveTo(x - dx, y - dy)
                g.lineTo(x + dx, y + dy)
            }
            this._snapIndicator.stroke({ color: snapIndicatorColor, pixelLine: true, })

        } else {
            throw new Error(`snapResult.snapped !== 'line': ${snapResult.snapped}`)
        }
    }

    private showPointSnapIndicator(point: APoint) {
        const { x, y } = this._stage.toLocal(point)
        const g = this._snapIndicator
        g.clear()
        g.circle(x, y, 1)
        const offset = 3
        g.moveTo(x, y - offset)
        g.lineTo(x, y + offset)
        g.moveTo(x - offset, y)
        g.lineTo(x + offset, y)
        this._snapIndicator.stroke({ color: snapIndicatorColor, pixelLine: true })
    }

    public hideSnapIndicator() {
        this._snapIndicator.clear()
    }

    public dispose() {
        if (this._disposed) return
        this._disposed = true
        const { _snapIndicator } = this
        if (_snapIndicator) {
            _snapIndicator.parent.removeChild(_snapIndicator)
            _snapIndicator.destroy()
        }
        this._subscriptions.forEach(x => x.unsubscribe())
    }
}