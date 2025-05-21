import { Application, FederatedPointerEvent, Graphics } from 'pixi.js'
import { calculateZoomToExtents, distanceFromPointToLine, drawOutline, fromPixiEvent, pointsToLines, shiftLine } from '../geometryFunc'
import { Logger } from '../logger'
import { addVectors, ALine, aPoint, APoint, ASubscription, mapLine, subtractVectors } from '../types'
import { BlockDragConfig, DragConfig, WallDragConfig } from './dragConfig'
import { Apartment } from '../entities/Apartment'
import { EventService } from '../EventService/EventService'
import { addApartmentEvent, deleteSelectedEvent, redoEvent, apartmentSelected, undoEvent, zoomToExtentsEvent, setApartmentProperties, addLLU, rotateSelected, sectionSettings } from '../components/events'
import { assertDefined, assertUnreachable, offsetPolygon, toError } from '../func'
import { MouseDownEvent } from '../EventService/eventTypes'
import { catchError, EMPTY, filter, fromEvent, map, mergeMap, of, switchMap, take, timeout } from 'rxjs'
import { SnapService } from './SnapService'
import { EditorCommand } from '../commands/EditorCommand'
import { AddObjectCommand } from '../commands/AddObjectCommand'
import { DeleteObjectsCommand } from '../commands/DeleteObjectsCommand'
import { MoveObjectCommand } from '../commands/MoveObjectCommand'
import { UpdateApartmentPointsCommand } from '../commands/UpdateApartmentPointsCommand'
import { initDevtools } from '@pixi/devtools'
import { Wall } from '../entities/Wall'
import { UpdateApartmentPropertiesCommand } from '../commands/UpdateApartmentPropertiesCommand'
import { GeometryBlock } from '../entities/GeometryBlock'
import { EditorObject } from '../entities/EditorObject'

export class Editor {
  private _app = new Application()
  private _logger = new Logger('Editor')
  private _eventService = new EventService()

  private _sectionOutline: { graphics: Graphics; offsetGraphics: Graphics; points: APoint[] } | null = null
  private _editorObjects = new Map<string, EditorObject>()
  private _selectedObjects = new Set<EditorObject>()
  private _dragConfig: | DragConfig | null = null

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

  private get selectedApartments() {
    return [...this._selectedObjects.values().filter(x => x instanceof Apartment)]
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

  /**
 * @description Настройка входящих событий от компонентов
 */
  private setupEvents() {
    this._subscriptions.push(...[
      addApartmentEvent.watch((shape) => {
        this.executeCommand(new AddObjectCommand(this, new Apartment(shape.points, this._eventService)))
      }),
      deleteSelectedEvent.watch(() => this.deleteSelected()),
      zoomToExtentsEvent.watch(() => this.zoomToExtents()),
      undoEvent.watch(() => this.undo()),
      redoEvent.watch(() => this.redo()),
      setApartmentProperties.watch((properties) => {
        const selectedApartments = this.selectedApartments
        if (selectedApartments.length > 0) {
          this.executeCommand(new UpdateApartmentPropertiesCommand(this, selectedApartments, properties))
        }
      }),
      addLLU.watch(() => {
        const llu = new GeometryBlock(this._eventService)
        this.app.stage.addChild(llu.container)
      }),
      rotateSelected.watch(() => {
        this.selectedApartments.forEach(x => x.rotate())
      }),
      sectionSettings.map(x => x.offset).watch(offset => this.renderSectionOffset(offset))
    ])
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
            this._selectedObjects.add(target)
            target.setSelected(true)
          } else if (ctrlKey || shiftKey) {
            // Мультиселект: добавляем/удаляем квартиру из выбора
            if (this._selectedObjects.has(target)) {
              this._selectedObjects.delete(target)
              target.setSelected(false)
            } else {
              this._selectedObjects.add(target)
              target.setSelected(true)
            }
          }
          this.onObjectSelected()
        })
    )
    this._subscriptions.push(this._eventService.mouseenter$.subscribe(e => {
      e.target.setHovered(true)
    }))
    this._subscriptions.push(this._eventService.mouseleave$.subscribe(e => {
      e.target.setHovered(false)
    }))
    this._subscriptions.push(this._eventService.events$.subscribe(e => {
      if (e.type === 'mousedown') {
        this.startDrag(e)
      } else if (e.type === 'mouseup') {
        if (this._dragConfig) this.stopDrag()
      } else if (e.type === 'mousemove' && this._dragConfig) {
        switch (this._dragConfig.type) {
          case 'dragBlock':
            this.dragBlock(this._dragConfig, e.pixiEvent)
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

  public onObjectSelected() {
    apartmentSelected([...this.selectedApartments.values().map(x => x.dto)])
  }

  private dragBlock(_dragConfig: BlockDragConfig, pixiEvent: FederatedPointerEvent) {
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
    if (target instanceof Apartment || target instanceof GeometryBlock) {
      const dragConfig: BlockDragConfig = {
        type: 'dragBlock',
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
      case 'dragBlock':
        this.executeCommand(new MoveObjectCommand(
          this,
          dragConfig.target,
          {
            startPos: dragConfig.startPos,
            endPos: aPoint(target.container.position)
          }))
        break
      case 'dragWall':
        this.executeCommand(new UpdateApartmentPointsCommand(
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

  private getSectionOutlineGlobalPoints() {
    return offsetPolygon(
      assertDefined(this._sectionOutline).points,
      sectionSettings.getState().offset)
      .map(x => aPoint(this.app.stage.toGlobal(x)))
  }

  private getSnapLines(options?: { exclude?: EditorObject }): ALine[] {
    const getLines = (o: EditorObject) => {
      if (o instanceof Apartment) return o.wallLines.map(mapLine(x => o.container.toGlobal(x)))
      if (o instanceof GeometryBlock) return o.globalLines
      if (o instanceof Wall) return []
      throw new Error('Unknown object type')
    }
    return [
      ...pointsToLines(this.getSectionOutlineGlobalPoints()),
      ...this._editorObjects
        .values()
        .filter(x => x !== options?.exclude)
        .flatMap(getLines)
    ]
  }

  private getSnapPoints(options: { exclude?: EditorObject }): APoint[] {
    const getPoints = (o: EditorObject) => {
      if (o instanceof Apartment) return o.globalPoints
      if (o instanceof GeometryBlock) return o.globalPoints
      if (o instanceof Wall) return []
      throw new Error('Unknown object type')
    }
    return [
      ...this.getSectionOutlineGlobalPoints(),
      ...this._editorObjects
        .values()
        .filter(x => x !== options.exclude)
        .flatMap(getPoints)
    ]
  }

  private deselectAll() {
    if (this._selectedObjects.size) {
      this._selectedObjects.forEach(x => x.setSelected(false))
      this._selectedObjects.clear()
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
    this._editorObjects.forEach(x => x.dispose())
    this._editorObjects.clear()
    this._eventService.dispose()
  }

  public setSectionOutline(points: APoint[]) {
    const graphics = new Graphics()
    drawOutline(graphics, points, undefined, { color: 0xaaaaaa })
    this.app.stage.addChild(graphics)
    const offsetGraphics = new Graphics()
    this.app.stage.addChild(offsetGraphics)
    this._sectionOutline = { graphics, points, offsetGraphics }
    this.renderSectionOffset(sectionSettings.getState().offset)
  }

  private renderSectionOffset(offset: number) {
    const { _sectionOutline } = this
    if (!_sectionOutline) return
    drawOutline(_sectionOutline.offsetGraphics, offsetPolygon(_sectionOutline.points, offset))
  }

  public addObject(o: EditorObject) {
    this._editorObjects.set(o.id, o)
    this.app.stage.addChild(o.container)
  }

  public deleteObject(o: EditorObject) {
    this.app.stage.removeChild(o.container)
    this._editorObjects.delete(o.id)
  }

  public getObject(id: string) {
    const o = assertDefined(this._editorObjects.get(id))
    return o
  }

  public getApartment(id: string) {
    const o = this.getObject(id)
    if (o instanceof Apartment) return o
    throw new Error('Object is not an Apartment')
  }

  public deleteSelected() {
    const selectedApartments = [...this._selectedObjects.values()]
    this.executeCommand(new DeleteObjectsCommand(this, selectedApartments))
    this._selectedObjects.clear()
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



