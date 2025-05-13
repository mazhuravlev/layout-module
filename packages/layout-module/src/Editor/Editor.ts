import { Application, Graphics } from 'pixi.js'
import { calculateZoomToExtents, drawOutline } from './func'
import { Logger } from '../logger'
import { PointLike } from '../types'
import { Apartment } from './Apartment'
import { EventService } from '../EventService/EventService'
import { addApartmentEvent, deleteSelectedEvent, selectionEvent } from '../components/events'

export class Editor {
  private _app = new Application()
  private _logger = new Logger('Editor')
  private _sectionOutline: { graphics: Graphics; points: PointLike[] } | null = null
  private _apartments = new Map<string, Apartment>()
  private _selectedApartment: Apartment | null = null
  private _eventService = new EventService()

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
    this.setupObjectEvents()
    this.setupEvents()
  }

  /**
   * @description Настройка входящих событий от компонентов
   */
  private setupEvents() {
    this.addCleanupFn(addApartmentEvent.watch((shape) => {
      this.addApartment(shape.points)
    }))
    this.addCleanupFn(deleteSelectedEvent.watch(() => {
      this.deleteSelected()
    }))
  }

  /**
   * @description Настройка событий редактора
   */
  private setupObjectEvents() {
    const clickSubscription = this._eventService.events$.subscribe(e => {
      if (e.type === 'click' && e.target instanceof Apartment) {
        const { target } = e
        this.deselectAll()
        target.select()
        this._selectedApartment = target
        selectionEvent([target.id])
      }
    })
    this.cleanupFns.push(() => {
      clickSubscription.unsubscribe()
    })

    const { stage } = this._app
    stage.eventMode = 'static'
    stage.hitArea = this._app.screen
    stage.on('click', (e: PointerEvent) => {
      if (e.target === this._app.stage) {
        this.deselectAll()
        selectionEvent([])
      }
    })

    this.cleanupFns.push(() => {
      if (this._app.stage) {
        this._app.stage.removeAllListeners()
      }
    })
  }

  private deselectAll() {
    if (this._selectedApartment) {
      this._selectedApartment.deselect()
      this._selectedApartment = null
    }
  }

  /**
   * @param fn Function to be called on dispose
   * @description This function is called when the editor is disposed. It can be used to clean up resources, such as event listeners or textures.
   */
  private addCleanupFn(fn: () => void) {
    this.cleanupFns.push(fn)
  }

  public async dispose(): Promise<void> {
    // TODO: выгрузить все текстуры
    this._app.destroy(true, { children: true })
    this.cleanupFns.forEach((fn) => fn())
    this.cleanupFns = []
    this._apartments.clear()
    this._eventService.dispose()
  }

  public setSectionOutline(points: PointLike[]) {
    const { _app: app } = this
    const graphics = new Graphics()
    drawOutline(graphics, points)
    graphics.stroke({ color: 0x0, width: 1 })
    app.stage.addChild(graphics)
    this._sectionOutline = { graphics, points }
  }

  private addApartment(points: PointLike[]) {
    const { _app: _pixi, _eventService } = this
    const apartment = new Apartment(points, _eventService)
    this._apartments.set(apartment.id, apartment)
    _pixi.stage.addChild(apartment.container)
  }

  public deleteSelected() {
    const { _app, _selectedApartment, _apartments } = this
    if (!_selectedApartment) return
    _app.stage.removeChild(_selectedApartment.container)
    _apartments.delete(_selectedApartment.id)
    _selectedApartment.dispose()
    this._selectedApartment = null
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



