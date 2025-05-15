import { Container, Graphics } from 'pixi.js'
import { APoint, ALine } from './types'
import { debugStore } from '../components/events'

type SnapResult =
    | { snapped: false }
    | {
        snapped: true
        dx: number
        dy: number
        snapPoint: APoint
    }

export class SnapService {
    private staticPoints: APoint[] = []
    private staticWalls: ALine[] = []
    private _drawDebug = debugStore.getState().drawDebug
    private config = {
        pointThreshold: 10,
        lineThreshold: 8,
        angleSnap: 90,
    }
    private snapIndicator: Graphics | null = null

    constructor(
        private stage: Container,
        staticPoints: APoint[],
        staticWalls: ALine[],
        config: Partial<typeof this.config> = {}
    ) {
        this.staticPoints = staticPoints
        this.staticWalls = staticWalls
        this.config = {
            ...this.config,
            ...config,
        }
    }

    /**
     * Проверяет привязку точки к статическим элементам
     */
    checkPointSnap(point: APoint): SnapResult {
        // 1. Проверка привязки к точкам
        const pointSnap = this.checkPointToPoint(point)
        if (pointSnap.snapped) return pointSnap

        // 2. Проверка привязки к линиям
        const lineSnap = this.checkPointToLine(point)
        if (lineSnap.snapped) return lineSnap

        return { snapped: false }
    }

    /**
     * Проверяет привязку линии к статическим элементам
     */
    checkWallSnap(wall: ALine): SnapResult {
        // Проверяем оба конца линии
        const startSnap = this.checkPointSnap(wall.start)
        const endSnap = this.checkPointSnap(wall.end)

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
    checkOutlineSnap(points: APoint[]): SnapResult {
        for (const point of points) {
            const result = this.checkPointSnap(point)
            if (result.snapped) {
                return result
            }
        }
        return { snapped: false }
    }

    private checkPointToPoint(point: APoint): SnapResult {
        let minDistance = Infinity
        let result: SnapResult = { snapped: false }

        for (const staticPoint of this.staticPoints) {
            const dx = staticPoint.x - point.x
            const dy = staticPoint.y - point.y
            const distance = Math.hypot(dx, dy)

            if (distance < this.config.pointThreshold! && distance < minDistance) {
                minDistance = distance
                result = {
                    snapped: true,
                    dx,
                    dy,
                    snapPoint: staticPoint
                }
            }
        }

        return result
    }

    private checkPointToLine(point: APoint): SnapResult {
        let minDistance = Infinity
        let result: SnapResult = { snapped: false }

        for (const wall of this.staticWalls) {
            const projected = this.projectPointToLine(point, wall)
            const dx = projected.x - point.x
            const dy = projected.y - point.y
            const distance = Math.hypot(dx, dy)

            if (distance < this.config.lineThreshold! && distance < minDistance) {
                minDistance = distance
                result = {
                    snapped: true,
                    dx,
                    dy,
                    snapPoint: projected
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

        if (!this.snapIndicator) {
            this.snapIndicator = new Graphics()
            this.stage.addChild(this.snapIndicator)
        }
        const { x, y } = this.stage.toLocal(point)
        this.snapIndicator.clear()
        this.snapIndicator.beginFill(0xFF0000, 0.5)
        this.snapIndicator.drawCircle(x, y, 5)
        this.snapIndicator.endFill()
    }

    public hideSnapIndicator() {
        if (this.snapIndicator) {
            this.snapIndicator.clear()
        }
    }

    public destroy() {
        if (this.snapIndicator) {
            this.snapIndicator.destroy()
            this.snapIndicator = null
        }
    }
}