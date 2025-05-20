import { Application, FederatedPointerEvent, Graphics } from 'pixi.js'
import { calculateZoomToExtents, distanceFromPointToLine, drawOutline, fromPixiEvent, pointsToLines, shiftLine } from '../geometryFunc'
import { Logger } from '../logger'
import { addVectors, ALine, aPoint, APoint, ASubscription, EditorObject, mapLine, subtractVectors } from '../types'
import { ApartmentDragConfig, DragConfig, WallDragConfig } from './dragConfig'
import { Apartment } from '../entities/Apartment'
import { EventService } from '../EventService/EventService'
import { addApartmentEvent, deleteSelectedEvent, redoEvent, apartmentSelected, toggleDrawDebug, undoEvent, zoomToExtentsEvent, setApartmentProperties } from '../components/events'
import { assertDefined, assertUnreachable, toError } from '../func'
import { MouseDownEvent } from '../EventService/eventTypes'
import { catchError, EMPTY, filter, fromEvent, map, mergeMap, of, switchMap, take, timeout } from 'rxjs'
import { SnapService } from './SnapService'
import { EditorCommand } from '../commands/EditorCommand'
import { AddApartmentCommand } from '../commands/AddAppartmentCommand'
import { DeleteApartmentsCommand } from '../commands/DeleteApartmentCommand'
import { MoveAppartmentCommand } from '../commands/MoveAppartmentCommand'
import { UpdateAppartmentPointsCommand } from '../commands/UpdateAppartmentPointsCommand'
import { initDevtools } from '@pixi/devtools'
import { Wall } from '../entities/Wall'
import { UpdateAppartmentPropertiesCommand } from '../commands/UpdateAppartmentPropertiesCommand'

export class Editor {
  private _app = new Application()
  private _logger = new Logger('Editor')
  private _sectionOutline: { graphics: Graphics; points: APoint[] } | null = null
  private _apartments = new Map<string, Apartment>()

  private _selectedApartments = new Set<Apartment>()
  private _dragConfig: | DragConfig | null = null
  private _eventService = new EventService()

  private _undoStack: EditorCommand[] = []
  private _redoStack: EditorCommand[] = []

  /**
   * @description Cleanup functions to be called on dispose
   */
  private cleanupFns: (() => void)[] = []

  private _subscriptions: ASubscription[] = []


  constructor(private _container: HTMLDivElement) { }

  public get app() {
    return this._app
  }

  public get eventService() {
    return this._eventService
  }

  public async init(): Promise<void> {
    this._logger.debug('init')
    if (process.env.NODE_ENV === 'development') {
      initDevtools({ app: this._app })
    }
    await this.app.init({
      background: '#ededed',
      resizeTo: this._container,
      autoStart: true,
      antialias: false,
    })
    this._container.appendChild(this._app.canvas)
    this.setupObjectEvents()
    this.setupEvents()
    this.setupKeyboardEvents()
  }

  /**
   * @description Настройка входящих событий от компонентов
   */
  private setupEvents() {
    this._subscriptions.push(addApartmentEvent.watch((shape) => {
      this.executeCommand(new AddApartmentCommand(this, new Apartment(shape.points, this._eventService)))
    }))
    this._subscriptions.push(deleteSelectedEvent.watch(() => this.deleteSelected()))
    this._subscriptions.push(zoomToExtentsEvent.watch(() => this.zoomToExtents()))
    this._subscriptions.push(undoEvent.watch(() => this.undo()))
    this._subscriptions.push(redoEvent.watch(() => this.redo()))
    this._subscriptions.push(setApartmentProperties.watch((properties) => {
      this.executeCommand(new UpdateAppartmentPropertiesCommand(this, [...this._selectedApartments], properties))
    }))
  }

  private executeCommand(command: EditorCommand) {
    this._undoStack.push(command)
    this._redoStack.forEach(x => x.dispose())
    this._redoStack = []
    command.execute()
  }

  public undo() {
    if (this._undoStack.length > 0) {
      const command = this._undoStack.pop()
      if (command) {
        command.undo()
        this._redoStack.push(command)
      }
    }
  }

  public redo() {
    if (this._redoStack.length > 0) {
      const command = this._redoStack.pop()
      if (command) {
        command.execute()
        this._undoStack.push(command)
      }
    }
  }

  private setupKeyboardEvents() {
    this._subscriptions.push(fromEvent<KeyboardEvent>(document, 'keydown', { passive: true })
      .pipe(filter(e => e.key === 'Delete'))
      .subscribe(() => this.deleteSelected()))
    this._subscriptions.push(fromEvent<KeyboardEvent>(document, 'keydown', { passive: true })
      .pipe(filter(e => e.code === 'KeyD'))
      .subscribe(() => toggleDrawDebug()))
  }

  /**
   * @description Настройка событий редактора
   */
  private setupObjectEvents() {
    this._subscriptions.push(
      this._eventService.mousedown$
        .pipe(
          switchMap((downEvent) => {
            const isCtrlPressed = downEvent.pixiEvent.ctrlKey || downEvent.pixiEvent.metaKey
            const isShiftPressed = downEvent.pixiEvent.shiftKey

            return this._eventService.mouseup$.pipe(
              take(1),
              timeout(200),
              filter((upEvent) => upEvent.target === downEvent.target),
              map((upEvent) => ({
                target: upEvent.target,
                ctrlKey: isCtrlPressed,
                shiftKey: isShiftPressed,
              })),
              catchError(() => EMPTY)
            )
          }),
          filter(({ target }) => target !== undefined)
        )
        .subscribe(({ target, ctrlKey, shiftKey }) => {
          if (target === undefined) return
          if (!(target instanceof Apartment)) return
          if (!ctrlKey && !shiftKey) {
            // Обычный клик (без модификаторов) → сброс предыдущего выбора
            this.deselectAll()
            this._selectedApartments.add(target)
            target.select()
          } else if (ctrlKey || shiftKey) {
            // Мультиселект: добавляем/удаляем квартиру из выбора
            if (this._selectedApartments.has(target)) {
              this._selectedApartments.delete(target)
              target.deselect()
            } else {
              this._selectedApartments.add(target)
              target.select()
            }
          }
          this.onApartmentSelected()
        })
    )
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
        apartmentSelected([])
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
        if (e.target instanceof EditorObject) {
          return of(e)
        } else {
          return EMPTY
        }
      }))
      .subscribe(event => {
        this._eventService.emit({ type: 'mouseup', pixiEvent: event })
      }))
  }

  public onApartmentSelected() {
    apartmentSelected([...this._selectedApartments.values().map(x => x.dto)])
  }

  private dragApartment(_dragConfig: ApartmentDragConfig, pixiEvent: FederatedPointerEvent) {
    const { target, snapService } = _dragConfig
    const toParentLocal = (point: APoint) => target.container.parent.toLocal(point)
    const toGlobal = (point: APoint) => target.container.parent.toGlobal(point)
    const delta = subtractVectors(pixiEvent.global, _dragConfig.startMousePos)
    const movedPoints = _dragConfig.originalGlobalPoints.map(p => addVectors(p, delta))
    const snapResult = snapService.checkOutlineSnap(movedPoints)
    if (snapResult.snapped) {
      snapService.showSnapIndicator(snapResult.snapPoint)
      const globalTargetPos = subtractVectors(
        addVectors(toGlobal(_dragConfig.startPos), delta),
        subtractVectors(snapResult.originalPoint, snapResult.snapPoint)
      )
      const newPos = toParentLocal(globalTargetPos)
      target.container.position.set(newPos.x, newPos.y)
    } else {
      snapService.hideSnapIndicator()
      const newPos = toParentLocal(addVectors(toGlobal(_dragConfig.startPos), delta))
      target.container.position.set(newPos.x, newPos.y)
    }
  }

  private dragWall(_dragConfig: WallDragConfig, pixiEvent: FederatedPointerEvent) {
    const { target: wall, snapService } = _dragConfig
    const distance = distanceFromPointToLine(_dragConfig.originalWallGlobalPoints, pixiEvent.global)
    const newLine = shiftLine(_dragConfig.originalWallGlobalPoints, -distance)
    const snapResult = snapService.checkLineSnap(newLine)
    if (snapResult.snapped) {
      snapService.showSnapIndicator(snapResult.snapPoint)
      const snapDistance = distanceFromPointToLine(_dragConfig.originalWallGlobalPoints, snapResult.snapPoint)
      const snapLine = shiftLine(_dragConfig.originalWallGlobalPoints, -snapDistance)
      wall.apartment.updateWall(wall, snapLine, 'global')
    } else {
      snapService.hideSnapIndicator()
      wall.apartment.updateWall(wall, newLine, 'global')
    }
  }

  private startDrag({ pixiEvent, target }: MouseDownEvent) {
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
          this.getSnapPoints({ exclude: target.apartment }),
          this.getSnapLines()),
        target,
        originalWallGlobalPoints: target.globalPoints,
        originalApartmentPoints: target.apartment.points
      }
      this._dragConfig = dragConfig
    }
  }

  private stopDrag() {
    const dragConfig = assertDefined(this._dragConfig)
    this._dragConfig = null
    dragConfig.snapService.dispose()
    const { type, target } = dragConfig
    switch (type) {
      case 'dragApartment':
        this.executeCommand(new MoveAppartmentCommand(
          this,
          dragConfig.target,
          {
            startPos: dragConfig.startPos,
            endPos: aPoint(target.container.position)
          }))
        break
      case 'dragWall':
        this.executeCommand(new UpdateAppartmentPointsCommand(
          this,
          dragConfig.target.apartment,
          {
            originalPoints: dragConfig.originalApartmentPoints,
            newPoints: dragConfig.target.apartment.points
          }))
        break
      default:
        assertUnreachable(type)
    }
  }

  private getSnapLines(): ALine[] {
    const floorPoints = assertDefined(this._sectionOutline).points
      .map(x => aPoint(this.app.stage.toGlobal(x)))
    return [
      ...pointsToLines(floorPoints),
      ...this._apartments.values().flatMap(apartment =>
        apartment.wallLines.map(mapLine(x => apartment.container.toGlobal(x)))
      )
    ]
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
    if (this._selectedApartments.size) {
      this._selectedApartments.forEach(x => x.deselect())
      this._selectedApartments.clear()
    }
  }

  public async dispose(): Promise<void> {
    this._logger.debug('dispose')
    this._subscriptions.forEach(x => x.unsubscribe())
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

  public addApartment(apartment: Apartment) {
    this._apartments.set(apartment.id, apartment)
    this.app.stage.addChild(apartment.container)
  }

  public deleteApartment(apartment: Apartment) {
    this.app.stage.removeChild(apartment.container)
    this._apartments.delete(apartment.id)
  }

  public getApartment(id: string) {
    return this._apartments.get(id)
  }

  public deleteSelected() {
    const selectedApartments = [...this._selectedApartments.values()]
    this.executeCommand(new DeleteApartmentsCommand(this, selectedApartments))
    this._selectedApartments.clear()
  }

  public zoomToExtents() {
    const { app } = this
    if (!app.stage.children.length) return

    app.stage.updateTransform({
      scaleX: 1,
      scaleY: 1,
      x: 0,
      y: 0,
    })
    app.render()

    const { centerX, centerY, scale } = calculateZoomToExtents(app, 30, [
      assertDefined(this._sectionOutline).graphics
    ])
    app.stage.updateTransform({
      scaleX: scale,
      scaleY: scale,
      x: app.screen.width / 2 - centerX * scale,
      y: app.screen.height / 2 - centerY * scale,
    })
  }
}



