import { Application, Container, FederatedPointerEvent } from 'pixi.js'
import { calculateZoomToExtents, distanceFromPointToLine, fromPixiEvent, pointsToLines, shiftLine } from '../geometryFunc'
import { Logger } from '../logger'
import { addVectors, ALine, aPoint, APoint, ASubscription, mapLine, mapPoint, subtractVectors } from '../types'
import { BlockDragConfig, DragConfig, WallDragConfig } from './dragConfig'
import { Apartment } from '../entities/Apartment'
import { EventService } from '../EventService/EventService'
import { addApartment, deleteSelected, redo, apartmentSelected, undo, zoomToExtents, setApartmentProperties, addLLU, rotateSelected, sectionSettings, flipSelected } from '../components/events'
import { assert, assertDefined, assertUnreachable, empty, isUndefined, not, notEmpty, notNull, toError } from '../func'
import { MouseDownEvent, MouseUpEvent } from '../EventService/eventTypes'
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
import { Units } from '../Units'
import { SimpleCommand } from '../commands/SimpleCommand'
import { SectionOutline } from './SectionOutline'

export class Editor {
    private _app = new Application()
    private _logger = new Logger('Editor')
    private _eventService = new EventService()

    private _sectionOutline: SectionOutline | null = null
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
        if (notEmpty(this._undoStack)) {
            const command = this._undoStack.pop()
            if (command) {
                command.undo()
                this._redoStack.push(command)
            }
        }
    }

    public redo() {
        if (notEmpty(this._undoStack)) {
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
            addApartment.watch((shape) => {
                this.executeCommand(new AddObjectCommand(this, new Apartment(shape.points, this._eventService)))
            }),
            addLLU.watch(() => {
                this.executeCommand(new AddObjectCommand(this, new GeometryBlock(this._eventService)))
            }),
            deleteSelected.watch(() => this.deleteSelected()),
            zoomToExtents.watch(() => this.zoomToExtents()),
            undo.watch(() => this.undo()),
            redo.watch(() => this.redo()),
            setApartmentProperties.watch((properties) => {
                if (empty(this.selectedApartments)) return
                this.executeCommand(new UpdateApartmentPropertiesCommand(this, this.selectedApartments, properties))
            }),
            rotateSelected.watch(angle => {
                if (empty(this.selectedApartments)) return
                this.executeCommand(new SimpleCommand(
                    () => this.selectedApartments.forEach(x => x.rotate(angle)),
                    () => this.selectedApartments.forEach(x => x.rotate(-angle))))
            }),
            flipSelected.watch(t => {
                if (empty(this.selectedApartments)) return
                const fn = () => this.selectedApartments.forEach(x => x.flip(t))
                this.executeCommand(new SimpleCommand(fn, fn))
            }),
            sectionSettings
                .map(x => x.offset)
                .watch(offset => this._sectionOutline?.setOffset(Units.fromMm(offset)))
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
                    if (isUndefined(target)) return
                    if (not(target.isSelectable)) return
                    if (not(ctrlKey && shiftKey)) {
                        // Обычный клик (без модификаторов) → сброс предыдущего выбора
                        this.deselectAll()
                        this.selectObject(target)
                        target.container.parent.addChild(target.container) // bring to front
                    } else if (ctrlKey || shiftKey) {
                        // Мультиселект: добавляем/удаляем квартиру из выбора
                        if (this._selectedObjects.has(target)) {
                            this.deselectObject(target)
                        } else {
                            this.selectObject(target)
                        }
                    }
                    this.onObjectSelected()
                })
        )
        this._subscriptions.push(this._eventService.mouseenter$
            .pipe(filter(() => notNull(this._dragConfig)))
            .subscribe(e => {
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
                    return of<MouseUpEvent>({ type: 'mouseup', pixiEvent: e, target: e.target })
                } else {
                    return of<MouseUpEvent>({ type: 'mouseup', pixiEvent: e })
                }
            }))
            .subscribe(event => {
                this._eventService.emit(event)
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
        snapService.showSnapIndicator(snapResult)
        if (snapResult.snapped) {
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
        const newLine = shiftLine(_dragConfig.originalWallGlobalPoints, -1 * snapService.applyGridSnap(distance))
        const snapResult = snapService.checkLineSnap(newLine)
        snapService.showSnapIndicator(snapResult)
        if (snapResult.snapped) {
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
                    this.getSnapLines({ exclude: target })),
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

    private getSnapLines(options?: { exclude?: EditorObject }): ALine[] {
        const getLines = (o: EditorObject) => {
            if (o instanceof Apartment) return o.wallLines.map(mapLine(x => o.container.toGlobal(x)))
            if (o instanceof GeometryBlock) return o.globalLines
            if (o instanceof Wall) return []
            throw new Error('Unknown object type')
        }
        return [
            ...pointsToLines(assertDefined(this._sectionOutline).globalPoints),
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
            ...assertDefined(this._sectionOutline).globalPoints,
            ...this._editorObjects
                .values()
                .filter(x => x !== options.exclude)
                .flatMap(getPoints)
        ]
    }

    public deselectAll() {
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

    /**
     * Задать контур секции
     * @param points Координаты точек в миллиметрах
     */
    public setSectionOutline(points: APoint[]) {
        assert(this._sectionOutline === null)
        this._sectionOutline = new SectionOutline(
            points.map(mapPoint(Units.fromMm)),
            Units.fromMm(sectionSettings.getState().offset)
        )
        this.app.stage.addChild(this._sectionOutline.container)
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
        const selectedObjects = [...this._selectedObjects.values()]
        this.executeCommand(new DeleteObjectsCommand(this, selectedObjects))
        this._selectedObjects.clear()
    }

    private selectObject(object: EditorObject) {
        this._selectedObjects.add(object)
        object.setSelected(true)
    }

    private deselectObject(object: EditorObject) {
        this._selectedObjects.delete(object)
        object.setSelected(false)
    }

    public selectObjects(objects: EditorObject[]) {
        this.deselectAll()
        objects.forEach(o => {
            o.setSelected(true)
            this._selectedObjects.add(o)
        })
    }

    public zoomToExtents(children?: Container[]) {
        const { app } = this
        const objects: Container[] = children ?? app.stage.children
        if (objects.length === 0) return

        app.stage.updateTransform({
            scaleX: 1,
            scaleY: 1,
            x: 0,
            y: 0,
        })
        app.render()

        const { centerX, centerY, scale } = calculateZoomToExtents(app, 30, objects)
        app.stage.updateTransform({
            scaleX: scale,
            scaleY: scale,
            x: app.screen.width / 2 - centerX * scale,
            y: app.screen.height / 2 - centerY * scale,
        })
    }
}



