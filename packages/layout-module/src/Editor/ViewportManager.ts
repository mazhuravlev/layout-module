import { Application, Container } from 'pixi.js'
import { EDITOR_CONFIG } from './editorConfig'
import { Viewport } from 'pixi-viewport'
import { ASubscription, IDisposable, unsubscribe } from '../types'
import { filter, fromEvent } from 'rxjs'
import { fromPixiEvent } from '../geometryFunc'
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
        this._viewport.fit()
    }

    public dispose(): void {
        const { _app, _viewport, _subscriptions } = this
        _subscriptions.forEach(unsubscribe)
        _app.stage.removeChild(_viewport)
        _viewport.destroy()
    }
}