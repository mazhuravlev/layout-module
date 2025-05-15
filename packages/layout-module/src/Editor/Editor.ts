import { Application, FederatedPointerEvent, Graphics } from 'pixi.js'
import { calculateZoomToExtents, distanceFromPointToLine, drawOutline, fromPixiEvent, shiftLine } from './func'
import { Logger } from '../logger'
import { ALine, APoint, EditorObject } from './types'
import { ApartmentDragConfig, DragConfig, isApartmentDragConfig, isWallDragConfig } from './dragConfig'
import { Apartment } from './Apartment'
import { EventService } from '../EventService/EventService'
import { addApartmentEvent, deleteSelectedEvent, selectionEvent, toggleDrawDebug, toggleSnap, zoomToExtentsEvent } from '../components/events'
import { assertDefined, toError } from '../func'
import { MouseDownEvent, MouseMoveEvent } from '../EventService/eventTypes'
import { catchError, EMPTY, filter, fromEvent, map, mergeMap, of, switchMap, take, timeout } from 'rxjs'
import { SnapService } from './SnapService'
import { Wall } from './Wall'

export class Editor {
  private _app: Application | null = null
  private _logger = new Logger('Editor')
  private _sectionOutline: { graphics: Graphics; points: APoint[] } | null = null
  private _apartments = new Map<string, Apartment>()

  private _selectedApartment: Apartment | null = null
  private _dragConfig: | DragConfig | null = null
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
    this.setupKeyboardEvents()
  }

  /**
   * @description Настройка входящих событий от компонентов
   */
  private setupEvents() {
    this.addCleanupFn(addApartmentEvent.watch((shape) => this.addApartment(shape.points)))
    this.addCleanupFn(deleteSelectedEvent.watch(() => this.deleteSelected()))
    this.addCleanupFn(zoomToExtentsEvent.watch(() => this.zoomToExtents()))
  }

  private setupKeyboardEvents() {
    const deleteSub = fromEvent<KeyboardEvent>(document, 'keydown', { passive: true })
      .pipe(filter(e => e.key === 'Delete' && this._selectedApartment != null))
      .subscribe(() => this.deleteSelected())
    this.cleanupFns.push(() => deleteSub.unsubscribe())

    const snapSub = fromEvent<KeyboardEvent>(document, 'keydown', { passive: true })
      .pipe(filter(e => e.code === 'KeyS'))
      .subscribe(() => toggleSnap())
    this.cleanupFns.push(() => snapSub.unsubscribe())
    const debugSub = fromEvent<KeyboardEvent>(document, 'keydown', { passive: true })
      .pipe(filter(e => e.code === 'KeyD'))
      .subscribe(() => toggleDrawDebug())
    this.cleanupFns.push(() => debugSub.unsubscribe())
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
        ),
        filter(x => x instanceof Apartment)
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
        if (this._dragConfig) this.stopDrag()
      } else if (e.type === 'mousemove' && this._dragConfig) {
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
        const MIN_ZOOM = 1
        const MAX_ZOOM = 6
        const newScale = Math.max(
          MIN_ZOOM,
          Math.min(MAX_ZOOM, stage.scale.x * zoomFactor) // Ограничиваем масштаб
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
      .subscribe(event => this._eventService.emit({ type: 'mousemove', pixiEvent: event }))
    this.addCleanupFn(() => stageMouseMoveSub.unsubscribe())

    const stageMouseUpSub = fromPixiEvent(this.app.stage, 'mouseup')
      .pipe(mergeMap(e => {
        if (e instanceof FederatedPointerEvent && e.target instanceof EditorObject) {
          return of(e)
        } else {
          return EMPTY
        }
      }))
      .subscribe(event => {
        this._eventService.emit({ type: 'mouseup', pixiEvent: event })
      })
    this.addCleanupFn(() => stageMouseUpSub.unsubscribe())
  }

  private drag({ pixiEvent }: MouseMoveEvent) {
    const { _dragConfig } = this
    if (isWallDragConfig(_dragConfig)) {
      // Перемещение стены
      const { target: wall } = _dragConfig
      const distance = distanceFromPointToLine(_dragConfig.startGlobalPoints, pixiEvent.global)
      const newLine = shiftLine(_dragConfig.startGlobalPoints, -distance)
      wall.apartment.updateWall(wall, newLine, 'global')
    } else if (isApartmentDragConfig(_dragConfig)) {
      // Перемещение квартиры
      const { target, offset, snapService } = _dragConfig
      const localMousePos = this.app.stage.toLocal(pixiEvent.global)
      const snapResult = snapService.checkOutlineSnap(target.globalPoints)
      if (snapResult.snapped) {
        setTimeout(() => snapService.showSnapIndicator(snapResult.snapPoint))
        const { originalPoint, snapPoint } = snapResult
        const localSnapPoint = target.container.parent.toLocal(snapPoint)
        const localOriginalPoint = target.container.toLocal(originalPoint)
        target.container.position.set(
          localSnapPoint.x - localOriginalPoint.x,
          localSnapPoint.y - localOriginalPoint.y
        )
      } else {
        setTimeout(() => snapService.hideSnapIndicator())
        target.container.position.set(
          localMousePos.x - offset.x,
          localMousePos.y - offset.y
        )
      }
    }
  }

  private startDrag({ pixiEvent, target }: MouseDownEvent) {
    const globalMousePos = this.app.stage.toLocal(pixiEvent.global)
    if (target instanceof Apartment) {
      const offset = {
        x: globalMousePos.x - target.container.position.x,
        y: globalMousePos.y - target.container.position.y
      }
      this._dragConfig = {
        snapService: new SnapService(
          this.app.stage,
          this.getSnapPoints({ exclude: target }),
          this.getSnapLines()),
        target,
        offset,
      } as ApartmentDragConfig
    } else if (target instanceof Wall) {
      this._dragConfig = {
        snapService: new SnapService(this.app.stage, [], []),
        target,
        startGlobalPoints: target.globalPoints,
      }
    }
  }

  private stopDrag() {
    assertDefined(this._dragConfig).snapService.dispose()
    this._dragConfig = null
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



