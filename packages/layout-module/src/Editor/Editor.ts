import { Application, Graphics } from 'pixi.js'
import { calculateZoomToExtents, drawOutline } from './func'
import { Logger } from '../logger'
import { PointLike } from '../types'
import { Apartment } from './Apartment'
import { EventService } from '../EventService/EventService'
import { addApartmentEvent, deleteSelectedEvent, selectionEvent } from '../components/events'
import { assertDefined } from '../func'
import { MouseDownEvent, MouseMoveEvent, MouseUpEvent } from '../EventService/eventTypes'
import { catchError, EMPTY, filter, map, switchMap, take, timeout } from 'rxjs'

export class Editor {
  private _app: Application | null = null
  private _logger = new Logger('Editor')
  private _sectionOutline: { graphics: Graphics; points: PointLike[] } | null = null
  private _apartments = new Map<string, Apartment>()
  private _selectedApartment: Apartment | null = null
  private _dragData: { target: Apartment; start: PointLike, offset: PointLike } | null = null
  private _eventService = new EventService()

  /**
   * @description Cleanup functions to be called on dispose
   */
  private cleanupFns: (() => void)[] = []

  constructor(private _container: HTMLDivElement) { }

  private get app() {
    return assertDefined(this._app)
  }

  public async init(): Promise<void> {
    this._app = new Application({
      background: '#ededed',
      resizeTo: this._container,
      autoStart: true,
    })
    this._container.appendChild((this._app.view as unknown) as Node)
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
    const clickSub = this._eventService.mousedown$
      .pipe(
        switchMap((down) =>
          this._eventService.mouseup$.pipe(
            take(1),
            timeout(200),
            filter((up) => up.target === down.target), // 👈 одна и та же квартира
            map((up) => up.target),
            catchError(() => EMPTY) // игнорируем timeout
          )
        )
      ).subscribe(target => {
        this.deselectAll()
        target.select()
        this._selectedApartment = target
        selectionEvent([target.id])
      })
    this.cleanupFns.push(() => clickSub.unsubscribe())

    const mouseDownSub = this._eventService.events$.subscribe(e => {
      if (e.type === 'mousedown') {
        this.startDrag(e)
      } else if (e.type === 'mouseup') {
        this.stopDrag(e)
      } else if (e.type === 'mousemove' && this._dragData) {
        this.drag(e)
      }
    })
    this.cleanupFns.push(() => mouseDownSub.unsubscribe())

    const { stage } = this.app
    stage.eventMode = 'static'
    stage.hitArea = this.app.screen
    stage.on('click', (e: PointerEvent) => {
      if (e.target === stage) {
        this.deselectAll()
        selectionEvent([])
      }
    })

    this.cleanupFns.push(() => {
      if (stage) {
        stage.removeAllListeners()
      }
    })
  }

  private drag({ event }: MouseMoveEvent) {
    const { target, offset } = assertDefined(this._dragData)
    const localPos = this.app.stage.toLocal(event.global)
    target.container.position.set(
      localPos.x - offset.x,
      localPos.y - offset.y
    )
  }

  private startDrag({ event, target }: MouseDownEvent) {
    const localOffset = this.app.stage.toLocal(event.global)
    const offset = {
      x: localOffset.x - target.container.position.x,
      y: localOffset.y - target.container.position.y
    }
    this._dragData = { target, offset, start: event.global }
  }

  private stopDrag(_e: MouseUpEvent) {
    this._dragData = null
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
    this.app.destroy(true, { children: true })
    this.cleanupFns.forEach((fn) => fn())
    this.cleanupFns = []
    this._apartments.clear()
    this._eventService.dispose()
  }

  public setSectionOutline(points: PointLike[]) {
    const graphics = new Graphics()
    drawOutline(graphics, points)
    this.app.stage.addChild(graphics)
    this._sectionOutline = { graphics, points }
  }

  private addApartment(points: PointLike[]) {
    const { _app: _pixi, _eventService } = this
    const apartment = new Apartment(points, _eventService)
    this._apartments.set(apartment.id, apartment)
    this.app.stage.addChild(apartment.container)
  }

  public deleteSelected() {
    const { _app, _selectedApartment, _apartments } = this
    if (!_selectedApartment) return
    this.app.stage.removeChild(_selectedApartment.container)
    _apartments.delete(_selectedApartment.id)
    _selectedApartment.dispose()
    this._selectedApartment = null
  }

  // 将舞台缩放到最大范围
  public zoomToExtents() {
    // 获取当前应用
    const { app } = this
    // 如果舞台没有子元素，则返回
    if (!app.stage.children.length) return
    // 计算缩放比例和中心点
    const { centerX, scale, centerY } = calculateZoomToExtents(app, 20)
    // 设置舞台的位置
    app.stage.position.set(
      app.screen.width / 2 - centerX * scale,
      app.screen.height / 2 - centerY * scale
    )
    // 设置舞台的缩放比例
    app.stage.scale.set(scale)
  }
}



