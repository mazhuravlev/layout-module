import { Application, FederatedPointerEvent, Graphics } from 'pixi.js'
import { calculateZoomToExtents, distanceFromPointToLine, drawOutline, fromPixiEvent, shiftLine } from './func'
import { Logger } from '../logger'
import { addVectors, ALine, aPoint, APoint, ASubscription, EditorObject, subtractVectors, unsubscribe } from './types'
import { ApartmentDragConfig, DragConfig, isApartmentDragConfig, isWallDragConfig, WallDragConfig } from './dragConfig'
import { Apartment } from './Apartment'
import { EventService } from '../EventService/EventService'
import { addApartmentEvent, deleteSelectedEvent, selectionEvent, toggleDrawDebug, toggleSnap, zoomToExtentsEvent } from '../components/events'
import { assertDefined, assertUnreachable, toError } from '../func'
import { MouseDownEvent } from '../EventService/eventTypes'
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

  private _subscriptions: ASubscription[] = []


  constructor(private _container: HTMLDivElement) { }

  private get app() {
    return assertDefined(this._app)
  }

  private get apartments(): Apartment[] {
    return [...this._apartments.values()]
  }

  public async init(): Promise<void> {
    this._logger.debug('init')
    this._app = new Application({
      background: '#ededed',
      resizeTo: this._container,
      autoStart: true,
      antialias: false,
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
    this._subscriptions.push(addApartmentEvent.watch((shape) => this.addApartment(shape.points)))
    this._subscriptions.push(deleteSelectedEvent.watch(() => this.deleteSelected()))
    this._subscriptions.push(zoomToExtentsEvent.watch(() => this.zoomToExtents()))
  }

  private setupKeyboardEvents() {
    this._subscriptions.push(fromEvent<KeyboardEvent>(document, 'keydown', { passive: true })
      .pipe(filter(e => e.key === 'Delete' && this._selectedApartment != null))
      .subscribe(() => this.deleteSelected()))
    this._subscriptions.push(fromEvent<KeyboardEvent>(document, 'keydown', { passive: true })
      .pipe(filter(e => e.code === 'KeyS'))
      .subscribe(() => toggleSnap()))
    this._subscriptions.push(fromEvent<KeyboardEvent>(document, 'keydown', { passive: true })
      .pipe(filter(e => e.code === 'KeyD'))
      .subscribe(() => toggleDrawDebug()))
  }

  /**
   * @description Настройка событий редактора
   */
  private setupObjectEvents() {
    this._subscriptions.push(this._eventService.mousedown$
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
      }))
    this._subscriptions.push(this._eventService.events$.subscribe(e => {
      if (e.type === 'mousedown') {
        this.startDrag(e)
      } else if (e.type === 'mouseup') {
        if (this._dragConfig) this.stopDrag()
      } else if (e.type === 'mousemove' && this._dragConfig) {
        switch (this._dragConfig.type) {
          case 'dragApartment':
            this.dragApartment(this._dragConfig, e.pixiEvent)
            break
          case 'dragWall':
            this.dragWall(this._dragConfig, e.pixiEvent)
            break
          default:
            assertUnreachable(this._dragConfig)
        }
      }
    }))

    const { stage } = this.app
    stage.eventMode = 'static'
    stage.hitArea = this.app.screen
    stage.on('click', (e: PointerEvent) => {
      if (e.target === stage) {
        this.deselectAll()
        selectionEvent([])
      }
    })

    this._subscriptions.push(fromEvent<WheelEvent>(this._container, 'wheel', { passive: true })
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
      }))
    this._subscriptions.push(fromPixiEvent(this.app.stage, 'mousemove')
      .pipe(filter(e => e instanceof FederatedPointerEvent))
      .subscribe(event => this._eventService.emit({ type: 'mousemove', pixiEvent: event })))
    this._subscriptions.push(fromPixiEvent(this.app.stage, 'mouseup')
      .pipe(mergeMap(e => {
        if (e instanceof FederatedPointerEvent && e.target instanceof EditorObject) {
          return of(e)
        } else {
          return EMPTY
        }
      }))
      .subscribe(event => {
        this._eventService.emit({ type: 'mouseup', pixiEvent: event })
      }))
  }

  private dragApartment(_dragConfig: ApartmentDragConfig, pixiEvent: FederatedPointerEvent) {
    const { target, snapService } = _dragConfig
    const toParentLocal = (point: APoint) => target.container.parent.toLocal(point)
    const toGlobal = (point: APoint) => target.container.parent.toGlobal(point)
    const delta = subtractVectors(pixiEvent.global, _dragConfig.startMousePos)
    const movedPoints = _dragConfig.originalGlobalPoints.map(p => addVectors(p, delta))
    const snapResult = snapService.checkOutlineSnap(movedPoints)
    if (snapResult.snapped) {
      setTimeout(() => snapService.showSnapIndicator(snapResult.snapPoint))
      const globalTargetPos = subtractVectors(
        addVectors(toGlobal(_dragConfig.startPos), delta),
        subtractVectors(snapResult.originalPoint, snapResult.snapPoint)
      )
      const newPos = toParentLocal(globalTargetPos)
      target.container.position.set(newPos.x, newPos.y)
    } else {
      setTimeout(() => snapService.hideSnapIndicator())
      const newPos = toParentLocal(addVectors(toGlobal(_dragConfig.startPos), delta))
      target.container.position.set(newPos.x, newPos.y)
    }
  }

  private dragWall(_dragConfig: WallDragConfig, pixiEvent: FederatedPointerEvent) {
    const { target: wall, snapService } = _dragConfig
    const distance = distanceFromPointToLine(_dragConfig.originalGlobalPoints, pixiEvent.global)
    const newLine = shiftLine(_dragConfig.originalGlobalPoints, -distance)
    const snapResult = snapService.checkWallSnap(newLine)
    if (snapResult.snapped) {
      setTimeout(() => snapService.showSnapIndicator(snapResult.snapPoint))
      const snapDistance = distanceFromPointToLine(_dragConfig.originalGlobalPoints, snapResult.snapPoint)
      const snapLine = shiftLine(_dragConfig.originalGlobalPoints, -snapDistance)
      wall.apartment.updateWall(wall, snapLine, 'global')
    } else {
      setTimeout(() => snapService.hideSnapIndicator())
      wall.apartment.updateWall(wall, newLine, 'global')
    }
  }

  private startDrag({ pixiEvent, target }: MouseDownEvent) {
    this._logger.debug('startDrag')
    if (target instanceof Apartment) {
      const dragConfig: ApartmentDragConfig = {
        type: 'dragApartment',
        snapService: new SnapService(
          this.app.stage,
          this.getSnapPoints({ exclude: target }),
          this.getSnapLines()),
        target,
        startPos: aPoint(target.container.position),
        startMousePos: aPoint(pixiEvent.global),
        originalGlobalPoints: target.globalPoints.map(aPoint)
      }
      this._dragConfig = dragConfig
    } else if (target instanceof Wall) {
      const dragConfig: WallDragConfig = {
        type: 'dragWall',
        snapService: new SnapService(
          this.app.stage,
          this.getSnapPoints({}),
          this.getSnapLines()),
        target,
        originalGlobalPoints: target.globalPoints,
      }
      this._dragConfig = dragConfig
    }
  }

  private stopDrag() {
    this._logger.debug('stopDrag')
    assertDefined(this._dragConfig).snapService.dispose()
    this._dragConfig = null
  }

  private getSnapLines(): ALine[] {
    return []
  }

  private getSnapPoints(options: { exclude?: Apartment }): APoint[] {
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

  public async dispose(): Promise<void> {
    this._logger.debug('dispose')
    this._subscriptions.forEach(unsubscribe)
    this.app.stage.removeAllListeners()
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



