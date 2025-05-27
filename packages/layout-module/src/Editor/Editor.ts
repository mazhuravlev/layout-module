import { Application, FederatedPointerEvent } from 'pixi.js'
import { distanceFromPointToLine, fromPixiEvent, pointsToLines, shiftLine } from '../geometryFunc'
import { Logger } from '../logger'
import { addVectors, ALine, aPoint, APoint, ASubscription, mapLine, mapPoint, multiplyVector, subtractVectors, unsubscribe } from '../types'
import { BlockDragConfig, DragConfig, WallDragConfig, WindowDragConfig } from './dragConfig'
import { Apartment } from '../entities/Apartment'
import { EventService } from '../EventService/EventService'
import * as events from '../components/events'
import { assert, assertDefined, assertUnreachable, empty, isNull, toError } from '../func'
import { MouseDownEvent, MouseUpEvent } from '../EventService/eventTypes'
import { filter, mergeMap, of } from 'rxjs'
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
import { SelectionManager } from './SelectionManager'
import { CommandManager } from './CommandManager'
import { ViewportManager } from './ViewportManager'
import { MouseEventProcessor } from './MouseEventProcessor'
import { createWindowsAlongOutline, snapWindowToOutline, WindowObj } from '../entities/Window'
import { UpdateWindowPropertiesCommand } from '../commands/UpdateWindowPropertiesCommand'
import { MoveWindowCommand } from '../commands/MoveWindowCommand'
import { EDITOR_CONFIG } from './editorConfig'

export class Editor {
    private _app = new Application()
    private _logger = new Logger('Editor')
    private _eventService = new EventService()

    private _sectionOutline: SectionOutline | null = null
    private _editorObjects = new Map<string, EditorObject>()
    private _dragConfig: | DragConfig | null = null

    private _selectionManager = new SelectionManager()
    private _commandManager = new CommandManager()
    private _viewportManager: ViewportManager | null = null
    private _mouseEventProcessor: MouseEventProcessor

    /**
     * @description Cleanup functions to be called on dispose
     */
    private cleanupFns: (() => void)[] = []

    private _subscriptions: ASubscription[] = []

    constructor(private _container: HTMLDivElement) {
        this._mouseEventProcessor = new MouseEventProcessor(
            this._eventService,
            this._selectionManager,
            () => this.onObjectSelected()
        )
    }

    public get stage() {
        return assertDefined(this._viewportManager).stage
    }

    public get scale() {
        return assertDefined(this._viewportManager).scale
    }

    public get eventService() {
        return this._eventService
    }

    public async init(): Promise<void> {
        this._logger.debug('init')
        const app = assertDefined(this._app, 'Editor._app must be defined')
        if (process.env.NODE_ENV === 'development') {
            initDevtools({ app })
        }
        await app.init({
            background: EDITOR_CONFIG.VISUAL.BACKGROUND_COLOR,
            resizeTo: this._container,
            autoStart: true,
            antialias: false,
        })
        this._container.appendChild(app.canvas)
        this._viewportManager = new ViewportManager(
            app,
            this._container,
            () => {
                this.deselectAll()
                this.onObjectSelected()
            }
        )
        this.setupObjectEvents()
        this.setupEvents()
    }

    private executeCommand(command: EditorCommand) {
        this._commandManager.execute(command)
    }

    public undo() { return this._commandManager.undo() }
    public redo() { return this._commandManager.redo() }
    public deselectAll() { this._selectionManager.deselectAll() }
    public selectObjects(objects: EditorObject[]) { this._selectionManager.selectObjects(objects) }
    public zoomToExtents() { this._viewportManager?.zoomToExtents() }

    private get selectedApartments() {
        return this._selectionManager.selectedApartments as Apartment[]
    }

    private setupEvents() {
        this._subscriptions.push(...[
            events.addApartment.watch((shape) => {
                this.executeCommand(new AddObjectCommand(this, new Apartment(shape.points, this._eventService)))
            }),
            events.addLLU.watch(() => {
                this.executeCommand(new AddObjectCommand(this, new GeometryBlock(this._eventService)))
            }),
            events.deleteSelected.watch(() => this.deleteSelected()),
            events.zoomToExtents.watch(() => this.zoomToExtents()),
            events.undo.watch(() => this.undo()),
            events.redo.watch(() => this.redo()),
            events.setApartmentProperties.watch((properties) => {
                if (empty(this.selectedApartments)) return
                this.executeCommand(new UpdateApartmentPropertiesCommand(this, this.selectedApartments, properties))
            }),
            events.rotateSelected.watch(angle => {
                if (empty(this.selectedApartments)) return
                this.executeCommand(new SimpleCommand(
                    () => this.selectedApartments.forEach(x => x.rotate(angle)),
                    () => this.selectedApartments.forEach(x => x.rotate(-angle))))
            }),
            events.flipSelected.watch(t => {
                if (empty(this.selectedApartments)) return
                const fn = () => this.selectedApartments.forEach(x => x.flip(t))
                this.executeCommand(new SimpleCommand(fn, fn))
            }),
            events.sectionSettings
                .map(x => x.offset)
                .watch(offset => this._sectionOutline?.setOffset(Units.fromMm(offset))),
            this._mouseEventProcessor.setupClickHandling(),
            events.populateWindows.watch((options) => {
                const { points } = assertDefined(this._sectionOutline)
                const windows = createWindowsAlongOutline(
                    points,
                    this._eventService,
                    options
                )
                this.executeCommand(new AddObjectCommand(this, windows))
            }),
            events.setWindowProperties.watch((properties) => {
                const { selectedWindows } = this._selectionManager
                if (empty(selectedWindows)) return
                this.executeCommand(new UpdateWindowPropertiesCommand(selectedWindows, properties))
            }),
        ])
    }

    /**
     * @description Настройка событий редактора
     */
    private setupObjectEvents() {
        this._subscriptions.push(this._eventService.mouseenter$
            .pipe(filter(() => isNull(this._dragConfig)))
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
                    case 'dragWindow':
                        this.dragWindow(this._dragConfig, e.pixiEvent)
                        break
                    default:
                        assertUnreachable(this._dragConfig)
                }
            }
        }))

        this._subscriptions.push(fromPixiEvent(this.stage, 'mousemove')
            .pipe(filter(e => e instanceof FederatedPointerEvent))
            .subscribe(event => this._eventService.emit({ type: 'mousemove', pixiEvent: event })))
        this._subscriptions.push(fromPixiEvent(this.stage, 'mouseup')
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
        // TODO: придумать что-то для работы со всеми типами объектов: квартиры, ЛЛУ, окна
        events.apartmentSelected([...this.selectedApartments.values().map(x => x.dto)])
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

    private dragWindow(_dragConfig: WindowDragConfig, pixiEvent: FederatedPointerEvent) {
        const { target, startMousePos, originalCenterPoint, sectionOutlinePoints } = _dragConfig
        const delta = subtractVectors(pixiEvent.global, startMousePos)
        const newPosition = addVectors(originalCenterPoint, multiplyVector(delta, 1 / this.scale))
        const snappedPosition = snapWindowToOutline(newPosition, sectionOutlinePoints)
        target.updatePosition(snappedPosition)
    }

    private startDrag({ pixiEvent, target }: MouseDownEvent) {
        if (target instanceof Apartment || target instanceof GeometryBlock) {
            const dragConfig: BlockDragConfig = {
                type: 'dragBlock',
                snapService: new SnapService(
                    this.stage,
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
                    this.stage,
                    this.getSnapPoints({ exclude: target.apartment }),
                    this.getSnapLines()),
                target,
                originalWallGlobalPoints: target.globalPoints,
                originalApartmentPoints: target.apartment.points
            }
            this._dragConfig = dragConfig
        } else if (target instanceof WindowObj) {
            const dragConfig: WindowDragConfig = {
                type: 'dragWindow',
                snapService: new SnapService(
                    this.stage,
                    [], // no point snapping for windows
                    []), // no line snapping for windows  
                target,
                startMousePos: aPoint(pixiEvent.global),
                originalCenterPoint: aPoint(target.centerPoint),
                sectionOutlinePoints: assertDefined(this._sectionOutline).points
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
            case 'dragWindow':
                this.executeCommand(new MoveWindowCommand(
                    dragConfig.target,
                    {
                        startPos: dragConfig.originalCenterPoint,
                        endPos: aPoint(dragConfig.target.centerPoint)
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
            if (o instanceof WindowObj) return []
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
            if (o instanceof WindowObj) return []
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

    public async dispose(): Promise<void> {
        this._logger.debug('dispose')
        this._subscriptions.forEach(unsubscribe)
        this.stage.removeAllListeners()
        try {
            this._app?.destroy(true, { children: true })
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
        this._commandManager.dispose()
    }

    /**
     * Задать контур секции
     * @param points Координаты точек в миллиметрах
     */
    public setSectionOutline(points: APoint[]) {
        assert(this._sectionOutline === null)
        this._sectionOutline = new SectionOutline(
            points.map(mapPoint(Units.fromMm)),
            Units.fromMm(events.sectionSettings.getState().offset)
        )
        this.stage.addChild(this._sectionOutline.container)
    }

    public addObject(o: EditorObject) {
        this._editorObjects.set(o.id, o)
        this.stage.addChild(o.container)
    }

    public deleteObject(o: EditorObject) {
        this.stage.removeChild(o.container)
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
        this.executeCommand(new DeleteObjectsCommand(this, this._selectionManager.selectedObjects))
    }
}
