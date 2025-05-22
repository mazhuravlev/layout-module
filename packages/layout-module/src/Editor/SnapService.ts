import { Container, Graphics } from 'pixi.js'
import { APoint, ALine, IDisposable, TPoints, ASubscription } from '../types'
import { $debugConfig, $snapConfig, SnapConfig } from '../components/events'
import { areLinesCollinear, pointsToLines } from '../geometryFunc'
import { Units } from '../Units'

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
        if (this._config.enableGrid) {
            const gridSnap = this.checkPointToGrid(point)
            if (gridSnap.snapped) return gridSnap
        }

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
        if (!this._config.enable) return emptyResult

        // 1. Проверка привязки к сетке (имеет приоритет)
        // if (this._config.enableGrid) {
        //     const gridSnap = this.checkLineToGrid([start, end])
        //     if (gridSnap.snapped) return gridSnap
        // }

        // // 2. Проверяем оба конца линии
        // const startSnap = this.checkPointSnap(start)
        // const endSnap = this.checkPointSnap(end)

        // if (startSnap.snapped && endSnap.snapped) {
        //     // Если оба конца привязаны, выбираем более близкую привязку
        //     const startDist = Math.hypot(startSnap.dx!, startSnap.dy!)
        //     const endDist = Math.hypot(endSnap.dx!, endSnap.dy!)

        //     return startDist < endDist ? startSnap : endSnap
        // } else if (startSnap.snapped || endSnap.snapped) {
        //     return startSnap.snapped ? startSnap : endSnap
        // }

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
                                snapped: true,
                                dx: projectedStart.x - start.x,
                                dy: projectedStart.y - start.y,
                                snapPoint: projectedStart,
                                originalPoint: start,
                            }
                        } else if (endDist < this._config.lineThreshold!) {
                            return {
                                snapped: true,
                                dx: projectedEnd.x - end.x,
                                dy: projectedEnd.y - end.y,
                                snapPoint: projectedEnd,
                                originalPoint: end,
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

    /**
     * Проверяет привязку точки к ближайшей точке сетки
     */
    private checkPointToGrid(point: APoint): SnapResult {
        const gridStep = this._config.gridStep
        if (!gridStep || gridStep <= 0) return emptyResult

        // Находим ближайшую точку сетки
        const snappedX = Math.round(point.x / gridStep) * gridStep
        const snappedY = Math.round(point.y / gridStep) * gridStep
        const dx = snappedX - point.x
        const dy = snappedY - point.y
        const distance = Math.hypot(dx, dy)

        if (distance < this._config.pointThreshold!) {
            return {
                snapped: true,
                dx,
                dy,
                snapPoint: { x: snappedX, y: snappedY },
                originalPoint: point
            }
        }

        return emptyResult
    }

    /**
     * Проверяет привязку стены к сетке (только перпендикулярное направление для ортогональных стен)
     */
    private checkLineToGrid([start, end]: TPoints): SnapResult {
        const gridStep = this._config.gridStep
        if (!gridStep || gridStep <= 0) return emptyResult

        // Проверяем, является ли стена ортогональной (0°, 90°, 180° или 270°)
        const angle = Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI
        const isOrthogonal = Math.abs(angle % 90) < this._config.angleSnap! / 2

        if (!isOrthogonal) return emptyResult

        // Определяем направление стены
        const isHorizontal = Math.abs(angle % 180) < this._config.angleSnap! / 2

        // Для горизонтальных стен привязываем только по Y, для вертикальных - только по X
        if (isHorizontal) {
            const snappedY1 = Math.round(start.y / gridStep) * gridStep
            const snappedY2 = Math.round(end.y / gridStep) * gridStep
            const dy1 = snappedY1 - start.y
            const dy2 = snappedY2 - end.y

            // Выбираем более близкую привязку
            if (Math.abs(dy1) <= Math.abs(dy2) && Math.abs(dy1) < this._config.lineThreshold!) {
                return {
                    snapped: true,
                    dx: 0,
                    dy: dy1,
                    snapPoint: { x: start.x, y: snappedY1 },
                    originalPoint: start
                }
            } else if (Math.abs(dy2) < this._config.lineThreshold!) {
                return {
                    snapped: true,
                    dx: 0,
                    dy: dy2,
                    snapPoint: { x: end.x, y: snappedY2 },
                    originalPoint: end
                }
            }
        } else {
            const snappedX1 = Math.round(start.x / gridStep) * gridStep
            const snappedX2 = Math.round(end.x / gridStep) * gridStep
            const dx1 = snappedX1 - start.x
            const dx2 = snappedX2 - end.x

            // Выбираем более близкую привязку
            if (Math.abs(dx1) <= Math.abs(dx2) && Math.abs(dx1) < this._config.lineThreshold!) {
                return {
                    snapped: true,
                    dx: dx1,
                    dy: 0,
                    snapPoint: { x: snappedX1, y: start.y },
                    originalPoint: start
                }
            } else if (Math.abs(dx2) < this._config.lineThreshold!) {
                return {
                    snapped: true,
                    dx: dx2,
                    dy: 0,
                    snapPoint: { x: snappedX2, y: end.y },
                    originalPoint: end
                }
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

        for (const line of this._staticLines) {
            const projected = this.projectPointToLine(point, line)
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
        if (this._disposed) return
        if (!this._drawDebug) return

        const { x, y } = this._stage.toLocal(point)
        this._snapIndicator.clear()
        this._snapIndicator.circle(x, y, 2)
        this._snapIndicator.fill({ color: 0xFF0000, alpha: 0.5 })
    }

    public hideSnapIndicator() {
        if (this._disposed) return
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