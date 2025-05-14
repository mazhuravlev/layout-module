import { Application, FederatedPointerEvent, Graphics } from 'pixi.js'
import { calculateZoomToExtents, drawOutline, fromPixiEvent } from './func'
import { Logger } from '../logger'
import { ALine, APoint } from '../types'
import { Apartment } from './Apartment'
import { EventService } from '../EventService/EventService'
import { addApartmentEvent, deleteSelectedEvent, selectionEvent, zoomToExtentsEvent } from '../components/events'
import { assertDefined, toError } from '../func'
import { MouseDownEvent, MouseMoveEvent } from '../EventService/eventTypes'
import { catchError, EMPTY, filter, fromEvent, map, mergeMap, of, switchMap, take, timeout } from 'rxjs'
import { SnapService } from './SnapService'

export class Editor {
  private _app: Application | null = null
  private _logger = new Logger('Editor')
  private _sectionOutline: { graphics: Graphics; points: APoint[] } | null = null
  private _apartments = new Map<string, Apartment>()

  private _selectedApartment: Apartment | null = null
  private _dragData:
    | {
      snapService: SnapService
      target: Apartment
      start: APoint
      offset: APoint
    }
    | null = null
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
    this.addCleanupFn(addApartmentEvent.watch((shape) => this.addApartment(shape.points)))
    this.addCleanupFn(deleteSelectedEvent.watch(() => this.deleteSelected()))
    this.addCleanupFn(zoomToExtentsEvent.watch(() => this.zoomToExtents()))

    const deleteSub = fromEvent<KeyboardEvent>(document, 'keydown', { passive: true })
      .pipe(filter(e => e.key === 'Delete' && this._selectedApartment != null))
      .subscribe(() => this.deleteSelected())
    this.cleanupFns.push(() => deleteSub.unsubscribe())
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
            map((_up) => down.target),
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

    const dragSub = this._eventService.events$.subscribe(e => {
      if (e.type === 'mousedown') {
        this.startDrag(e)
      } else if (e.type === 'mouseup') {
        if (this._dragData) this.stopDrag()
      } else if (e.type === 'mousemove' && this._dragData) {
        this.drag(e)
      }
    })
    this.cleanupFns.push(() => dragSub.unsubscribe())

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

    const wheelSub = fromEvent<WheelEvent>(this._container, 'wheel', { passive: true })
      .subscribe(e => {
        const { stage } = this.app
        const clientPoint = { x: e.clientX, y: e.clientY }
        const mouseGlobalBeforeZoom = stage.toLocal(clientPoint)

        // Определяем направление и скорость зума
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1 // Уменьшаем или увеличиваем масштаб
        const newScale = Math.max(
          0.1,
          Math.min(10, stage.scale.x * zoomFactor) // Ограничиваем масштаб
        )

        stage.scale.set(newScale)

        // Корректируем позицию stage для зума относительно курсора
        const mouseGlobalAfterZoom = stage.toLocal(clientPoint)
        stage.position.x += (mouseGlobalAfterZoom.x - mouseGlobalBeforeZoom.x) * newScale
        stage.position.y += (mouseGlobalAfterZoom.y - mouseGlobalBeforeZoom.y) * newScale
      })
    this.cleanupFns.push(() => wheelSub.unsubscribe())

    const stageMouseMoveSub = fromPixiEvent(this.app.stage, 'mousemove')
      .pipe(filter(e => e instanceof FederatedPointerEvent))
      .subscribe(event => this._eventService.emit({ type: 'mousemove', event }))
    this.addCleanupFn(() => stageMouseMoveSub.unsubscribe())

    const stageMouseUpSub = fromPixiEvent(this.app.stage, 'mouseup')
      .pipe(mergeMap(e => {
        if (e instanceof FederatedPointerEvent && e.target === this.app.stage) {
          return of(e)
        } else {
          return EMPTY
        }
      }))
      .subscribe(event => {
        this._eventService.emit({ type: 'mouseup', event })
      })
    this.addCleanupFn(() => stageMouseUpSub.unsubscribe())
  }

  private drag({ event }: MouseMoveEvent) {
    const { target, offset, snapService } = assertDefined(this._dragData)
    const localEventPos = this.app.stage.toLocal(event.global)

    const snapResult = snapService.checkOutlineSnap(target.globalPoints)
    if (snapResult.snapped) {
      snapService.showSnapIndicator(snapResult.snapPoint)
    } else {
      snapService.hideSnapIndicator()
    }
    target.container.position.set(
      localEventPos.x - offset.x,
      localEventPos.y - offset.y
    )
  }

  private startDrag({ event, target }: MouseDownEvent) {
    const start = this.app.stage.toLocal(event.global)
    const offset = {
      x: start.x - target.container.position.x,
      y: start.y - target.container.position.y
    }
    this._dragData = {
      snapService: new SnapService(
        this.app.stage,
        this.getSnapPoints({ exclude: target }),
        this.getSnapLines()),
      target,
      offset,
      start,
    }
  }

  private getSnapLines(): ALine[] {
    return []
  }

  private getSnapPoints(options: { exclude: Apartment }): APoint[] {
    return [
      ...assertDefined(this._sectionOutline).points.map(x => this.app.stage.toGlobal(x)),
      ...this._apartments
        .values()
        .filter(x => x !== options.exclude)
        .flatMap(x => x.globalPoints)
    ]
  }

  private stopDrag() {
    assertDefined(this._dragData).snapService.destroy()
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
    try {
      this.app.destroy(true, { children: true })
    } catch (error) {
      this._logger.error('Error destroying app:', toError(error))
    }

    for (const fn of this.cleanupFns) {
      try {
        fn()
      } catch (error) {
        this._logger.error('Error in cleanup function:', toError(error))
      }
    }

    this.cleanupFns = []
    this._apartments.clear()
    this._eventService.dispose()
  }

  public setSectionOutline(points: APoint[]) {
    const graphics = new Graphics()
    drawOutline(graphics, points)
    this.app.stage.addChild(graphics)
    this._sectionOutline = { graphics, points }
  }

  private addApartment(points: APoint[]) {
    const { _app: _pixi, _eventService } = this
    const apartment = new Apartment(points, _eventService)
    this._apartments.set(apartment.id, apartment)
    this.app.stage.addChild(apartment.container)
  }

  public deleteSelected() {
    const { _selectedApartment, _apartments } = this
    if (!_selectedApartment) return
    this.app.stage.removeChild(_selectedApartment.container)
    _apartments.delete(_selectedApartment.id)
    _selectedApartment.dispose()
    this._selectedApartment = null
  }

  public zoomToExtents() {
    const { app } = this
    if (!app.stage.children.length) return

    app.stage.setTransform(0, 0, 1, 1, 0, 0, 0, 0, 0)
    app.render()

    const { centerX, centerY, scale } = calculateZoomToExtents(app, 30, [
      assertDefined(this._sectionOutline).graphics
    ])
    app.stage.setTransform(
      app.screen.width / 2 - centerX * scale,
      app.screen.height / 2 - centerY * scale,
      scale,
      scale,
      0, 0, 0, 0, 0
    )
  }
}



