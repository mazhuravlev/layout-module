import { Application, Container } from 'pixi.js'
import { EDITOR_CONFIG } from './editorConfig'
import { Viewport } from 'pixi-viewport'
import { ASubscription, IDisposable, unsubscribe } from '../types'
import { filter, fromEvent } from 'rxjs'
import { empty, fromPixiEvent } from '../func'
import { assert } from '../func'

export class ViewportManager implements IDisposable {
    private _viewport: Viewport
    private _subscriptions: ASubscription[] = []

    public get stage(): Container {
        return this._viewport
    }

    public get scale() {
        const { x, y } = this._viewport.scale
        assert(x === y)
        return x
    }

    constructor(
        private _app: Application,
        container: HTMLDivElement,
        onStageClick: () => void,
    ) {
        this._viewport = new Viewport({
            screenWidth: container.clientWidth,
            screenHeight: container.clientHeight,
            events: _app.renderer.events,
            passiveWheel: false,
        })
        this._viewport
            .wheel()
            .clampZoom({
                minScale: EDITOR_CONFIG.ZOOM.MIN,
                maxScale: EDITOR_CONFIG.ZOOM.MAX
            })
            .decelerate()
        this._subscriptions.push(fromEvent(container, 'resize')
            .subscribe(() => this._viewport.resize(container.clientWidth, container.clientHeight)))
        this._subscriptions.push(fromPixiEvent(this.stage, 'click')
            .pipe(filter(e => e.target === this._viewport))
            .subscribe(onStageClick))
        _app.stage.addChild(this._viewport)
    }

    public zoomToExtents() {
        const { _app, _viewport } = this
        const objects = _viewport.children
        if (empty(objects)) return

        const invMatrix = _viewport.worldTransform.clone().invert()
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        objects.forEach((child) => {
            const bounds = child.getBounds(false)
            bounds.applyMatrix(invMatrix)
            minX = Math.min(minX, bounds.x)
            minY = Math.min(minY, bounds.y)
            maxX = Math.max(maxX, bounds.x + bounds.width)
            maxY = Math.max(maxY, bounds.y + bounds.height)
        })

        const centerX = (minX + maxX) / 2
        const centerY = (minY + maxY) / 2
        const width = maxX - minX
        const height = maxY - minY

        const scaleX = (_app.screen.width - EDITOR_CONFIG.VISUAL.ZOOM_TO_EXTENTS_PADDING) / width
        const scaleY = (_app.screen.height - EDITOR_CONFIG.VISUAL.ZOOM_TO_EXTENTS_PADDING) / height
        const scale = Math.min(scaleX, scaleY)

        _viewport.setZoom(scale)
        _viewport.moveCenter(centerX, centerY)
    }

    public dispose(): void {
        const { _app, _viewport, _subscriptions } = this
        _subscriptions.forEach(unsubscribe)
        _app.stage.removeChild(_viewport)
        _viewport.destroy()
    }
}
