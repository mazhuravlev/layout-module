import { Application, Graphics } from 'pixi.js'
import { calculateZoomToExtents, drawOutline } from './func'
import { Logger } from '../logger'
import { PointLike } from '../types'
import { Apartment } from './Apartment'

export class Editor {
  private _app = new Application()
  private _logger = new Logger('Editor')
  private _sectionOutline: { graphics: Graphics; points: PointLike[] } | null = null
  private _apartments = new Map<string, Apartment>()
  private _selectedApartment: Apartment | null = null

  /**
   * @description Cleanup functions to be called on dispose
   */
  private cleanupFns: (() => void)[] = []

  constructor(private _container: HTMLDivElement) { }

  public async init(): Promise<void> {
    const { _app: app, _container: container } = this
    await app.init({
      background: '#ffffff',
      resizeTo: container,
    })
    container.appendChild(app.canvas)
  }

  /**
   * @param fn Function to be called on dispose
   * @description This function is called when the editor is disposed. It can be used to clean up resources, such as event listeners or textures.
   */
  public addCleanupFn(fn: () => void) {
    this.cleanupFns.push(fn)
  }

  public async dispose(): Promise<void> {
    // TODO: выгрузить все текстуры
    this._app.destroy(true, { children: true })
    this.cleanupFns.forEach((fn) => fn())
    this.cleanupFns = []
    this._apartments.clear()
  }

  public setSectionOutline(points: PointLike[]) {
    const { _app: app } = this
    const graphics = new Graphics()
    drawOutline(graphics, points)
    graphics.stroke({ color: 0x0, width: 1 })
    app.stage.addChild(graphics)
    this._sectionOutline = { graphics, points }
  }

  public addApartment(points: PointLike[]) {
    const { _app: app } = this
    const apartment = new Apartment(points)
    apartment.events.subscribe(({ type, apartment }) => {
      if (type === 'apartment-click') {
        apartment.select()
        this._selectedApartment = apartment
      }
    })
    this._apartments.set(apartment.id, apartment)
    app.stage.addChild(apartment.container)
  }

  public zoomToExtents() {
    const { _app: app } = this
    if (!app.stage.children.length) return
    const { centerX, scale, centerY } = calculateZoomToExtents(app, 20)
    app.stage.position.set(
      app.screen.width / 2 - centerX * scale,
      app.screen.height / 2 - centerY * scale
    )
    app.stage.scale.set(scale)
  }
}



