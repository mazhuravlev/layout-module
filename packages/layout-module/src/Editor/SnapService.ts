import { Container, Graphics } from 'pixi.js'
import { APoint, ALine, IDisposable, TPoints, ASubscription, unsubscribe } from '../types'
import { $debugConfig, $snapConfig, SnapConfig } from '../components/events'
import { areLinesCollinear, getPointDistance, getSlope, pointsToLines, projectPointOnLine } from '../geometryFunc'
import { Units } from '../Units'
import { assertUnreachable, not } from '../func'

const emptyResult: NoSnap = { snapped: false }

type NoSnap = { snapped: false }

type PointSnap = {
    snapped: 'point'
    snapPoint: APoint
    originalPoint: APoint
}

type LineSnap = {
    snapped: 'line'
    snapPoint: APoint
    originalPoint: APoint
    k: number | null
}

type SnapResult =
    | NoSnap
    | PointSnap
    | LineSnap

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

        if (this._config.enablePoint) {
            const pointSnap = this.checkPointToPoint(point)
            if (pointSnap.snapped) return pointSnap
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
                const areCollinear = areLinesCollinear({ start, end }, staticLine)
                if (areCollinear) {
                    // Проецируем оба конца линии на статическую линию
                    const projectedStart = projectPointOnLine(start, staticLine)
                    const projectedEnd = projectPointOnLine(end, staticLine)

                    // Проверяем расстояние от исходных точек до проекций
                    const startDist = getPointDistance(projectedStart, start)
                    const endDist = getPointDistance(projectedEnd, end)

                    if (startDist < this._config.lineThreshold! || endDist < this._config.lineThreshold!) {
                        // Выбираем точку с минимальным расстоянием
                        const result = (p: APoint): LineSnap => ({
                            snapped: 'line',
                            snapPoint: p,
                            originalPoint: start,
                            k: getSlope(start, end),
                        })
                        if (startDist <= endDist && startDist < this._config.lineThreshold!) {
                            return result(projectedStart)
                        } else if (endDist < this._config.lineThreshold!) {
                            return result(projectedEnd)
                        }
                    }
                }
            }
        }

        return emptyResult
    }

    /**
     * Проверяет привязку контура (всех точек)
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

            if (distance < this._config.pointThreshold && distance < minDistance) {
                minDistance = distance
                result = {
                    snapped: 'point',
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
            const projected = projectPointOnLine(point, line)
            const dx = projected.x - point.x
            const dy = projected.y - point.y
            const distance = Math.hypot(dx, dy)

            if (distance < this._config.lineThreshold! && distance < minDistance) {
                minDistance = distance
                result = {
                    snapped: 'line',
                    snapPoint: projected,
                    originalPoint: point,
                    k: getSlope(line.start, line.end),
                }
            }
        }

        return result
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
        const offset = 3
        this._snapIndicator
            .clear()
            .circle(x, y, 1)
            .moveTo(x, y - offset)
            .lineTo(x, y + offset)
            .moveTo(x - offset, y)
            .lineTo(x + offset, y)
            .stroke({ color: snapIndicatorColor, pixelLine: true })
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
        this._subscriptions.forEach(unsubscribe)
    }
}