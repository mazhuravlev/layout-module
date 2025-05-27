import { Application, Container } from 'pixi.js'
import { EDITOR_CONFIG } from './editorConfig'
import { Viewport } from 'pixi-viewport'
import { ASubscription, IDisposable, unsubscribe } from '../types'
import { fromEvent } from 'rxjs'

export class ViewportManager implements IDisposable {
    private _viewport: Viewport
    private _subscriptions: ASubscription[] = []

    public get stage(): Container {
        return this._viewport
    }

    constructor(
        private _app: Application,
        container: HTMLDivElement
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