import { Application, Container } from 'pixi.js'
import { fromEvent } from 'rxjs'
import { calculateZoomToExtents } from '../geometryFunc'

export class ViewportManager {
    private static readonly MIN_ZOOM = 1
    private static readonly MAX_ZOOM = 6

    constructor(private app: Application, private container: HTMLDivElement) { }

    setupZoomControls() {
        return fromEvent<WheelEvent>(this.container, 'wheel', { passive: true })
            .subscribe(this.handleWheel.bind(this))
    }

    private handleWheel(e: WheelEvent) {
        const { stage } = this.app
        const clientPoint = { x: e.clientX, y: e.clientY }
        const mouseGlobalBeforeZoom = stage.toLocal(clientPoint)

        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
        const newScale = Math.max(
            ViewportManager.MIN_ZOOM,
            Math.min(ViewportManager.MAX_ZOOM, stage.scale.x * zoomFactor)
        )

        stage.scale.set(newScale)

        const mouseGlobalAfterZoom = stage.toLocal(clientPoint)
        stage.position.x += (mouseGlobalAfterZoom.x - mouseGlobalBeforeZoom.x) * newScale
        stage.position.y += (mouseGlobalAfterZoom.y - mouseGlobalBeforeZoom.y) * newScale
    }

    zoomToExtents(objects?: Container[]) {
        const containers = objects ?? this.app.stage.children
        if (containers.length === 0) return

        this.app.stage.updateTransform({ scaleX: 1, scaleY: 1, x: 0, y: 0 })
        this.app.render()

        const { centerX, centerY, scale } = calculateZoomToExtents(this.app, 30, containers)
        this.app.stage.updateTransform({
            scaleX: scale,
            scaleY: scale,
            x: this.app.screen.width / 2 - centerX * scale,
            y: this.app.screen.height / 2 - centerY * scale,
        })
    }
}