import { Application, FederatedPointerEvent } from 'pixi.js'
import { distanceFromPointToLine, getLineLength, pointsToLines, shiftLine } from '../geometryFunc'
import { Logger } from '../logger'
import { ALine, APoint, ASubscription, LogicError, unsubscribe } from '../types'
import { addVectors, aPoint, mapLine, mapPoint, multiplyVector, subtractVectors } from '../geometryFunc'
import { BlockDragConfig, DragConfig, WallDragConfig, WindowDragConfig, withDragOutline } from './dragConfig'
import { Apartment } from '../entities/Apartment'
import { EventService } from '../EventService/EventService'
import * as events from '../components/events'
import { assert, assertDefined, assertUnreachable, empty, isNull, notNull, toError, fromPixiEvent, isDefined, isUndefined, makeUuid } from '../func'
import { MouseDownEvent } from '../EventService/eventTypes'
import { debounceTime, EMPTY, filter, finalize, map, merge, mergeMap, take, takeUntil, tap } from 'rxjs'
import { SnapService } from './SnapService'
import { EditorCommand } from '../commands/EditorCommand'
import { AddObjectCommand } from '../commands/AddObjectCommand'
import { DeleteObjectsCommand } from '../commands/DeleteObjectsCommand'
import { MoveObjectCommand } from '../commands/MoveObjectCommand'
import { UpdateApartmentPointsCommand } from '../commands/UpdateApartmentPointsCommand'
import { initDevtools } from '@pixi/devtools'
import { Wall } from '../entities/Wall'
import { UpdateApartmentPropertiesCommand } from '../commands/UpdateApartmentPropertiesCommand'
import { GeometryBlock } from '../entities/GeometryBlock/GeometryBlock'
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
import { KeyboardState } from './KeyboardState'
import { EntityDtoArray } from './dtoSchema'
import lluData from '../entities/GeometryBlock/llu'
import { serializeEditorObject } from './dto'
import { DataAccess } from '../dataAccess/DataAccess'

export class Editor {
    private _app = new Application()
    private _logger = new Logger('Editor')
    private _eventService = new EventService()

    private _sectionOutline: SectionOutline | null = null
    private _editorObjects = new Map<string, EditorObject>()
    private _isDragging = false

    private _selectionManager: SelectionManager
    private _commandManager = new CommandManager()
    private _viewportManager: ViewportManager | null = null
    private _mouseEventProcessor: MouseEventProcessor
    private _keyboardState = new KeyboardState()

    private _currentLayout: {
        sectionId: string
        layoutId: string
    } | null = null

    /**
     * @description Cleanup functions to be called on dispose
     */
    private cleanupFns: (() => void)[] = []

    private _subscriptions: ASubscription[] = []

    constructor(
        private _container: HTMLDivElement,
        private _dataAccess: DataAccess,
    ) {
        this._selectionManager = new SelectionManager(
            this._eventService,
            () => [...this._editorObjects.values()]
        )
        this._mouseEventProcessor = new MouseEventProcessor(
            this._eventService,
            () => this.stage,
        )
    }

    private get stage() {
        return assertDefined(this._viewportManager).stage
    }

    public get scale() {
        return assertDefined(this._viewportManager).scale
    }

    public get eventService() {
        return this._eventService
    }

    private get currentLayout() {
        return assertDefined(this._currentLayout)
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
        )
        this.setupObjectEvents()
        this.setupEvents()
    }

    private executeCommand(command: EditorCommand) {
        this._commandManager.execute(command)
        this._eventService.emit({ type: 'documentUpdate' })
    }

    public undo() { return this._commandManager.undo() }
    public redo() { return this._commandManager.redo() }
    public deselectAll() { this._selectionManager.deselectAll() }
    public selectObjects(objects: EditorObject[]) { this._selectionManager.selectObjects(objects) }
    public zoomToExtents() { this._viewportManager?.zoomToExtents() }

    private getDocument(): EntityDtoArray {
        const _objects = [...this._editorObjects.values()
            .map(x => x.serialize())
            .filter(notNull)]
        const objects: EntityDtoArray = EntityDtoArray.parse(JSON.parse(JSON.stringify(_objects)))
        return objects
    }

    // public async loadDocument(state: ADocumentType) {
    //     const { sectionId, objects, sectionOffset } = state
    //     events.setSectionOffset(sectionOffset)
    //     this.loadSection(sectionId)
    //     const editorObjects = objects.map(x => {
    //         switch (x.type) {
    //             case 'apartment':
    //                 return Apartment.deserialize(this.eventService, x)
    //             case 'window':
    //                 return WindowObj.deserialize(this.eventService, x)
    //             case 'geometryBlock':
    //                 return GeometryBlock.deserialize(this.eventService, x)
    //             default:
    //                 throw assertUnreachable(x)
    //         }
    //     })
    //     new AddObjectCommand(this, editorObjects).execute()
    // }

    private setupEvents() {
        this._subscriptions.push(...[
            events.addApartment.watch((shape) => {
                this.executeCommand(new AddObjectCommand(
                    this,
                    new Apartment(this._eventService, shape.points.map(mapPoint(Units.fromMm)))))
            }),
            events.addLLU.watch(() => {
                this.executeCommand(new AddObjectCommand(this, new GeometryBlock(this._eventService, lluData)))
            }),
            events.deleteSelected.watch(() => this.deleteSelected()),
            events.zoomToExtents.watch(() => this.zoomToExtents()),
            events.undo.watch(() => this.undo()),
            events.redo.watch(() => this.redo()),
            events.setApartmentProperties.watch((properties) => {
                const { selectedApartments } = this._selectionManager
                if (empty(selectedApartments)) return
                this.executeCommand(new UpdateApartmentPropertiesCommand(selectedApartments, properties))
                this._selectionManager.update()
            }),
            events.rotateSelected.watch(angle => {
                const { selectedObjects } = this._selectionManager
                if (empty(selectedObjects)) return
                this.executeCommand(new SimpleCommand(
                    () => selectedObjects.forEach(x => x.rotate(angle)),
                    () => selectedObjects.forEach(x => x.rotate(-angle))))
            }),
            events.flipSelected.watch(t => {
                const { selectedObjects } = this._selectionManager
                if (empty(selectedObjects)) return
                const fn = () => selectedObjects.forEach(x => x.flip(t))
                this.executeCommand(new SimpleCommand(fn, fn))
            }),
            events.$sectionSettings
                .map(x => x.offset)
                .watch(offset => this._sectionOutline?.setOffset(Units.fromMm(offset))),
            this._mouseEventProcessor.setupClickHandling(),
            this._mouseEventProcessor.setupFrameSelection(),
            events.populateWindows.watch((options) => {
                if (isNull(this._sectionOutline)) return
                const { points } = this._sectionOutline
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
                this._selectionManager.update()
            }),
            events.selectFloorType.watch(async (floorType) => {
                this.unloadObjects()
                events.setFloorType(floorType)
            }),
            events.createNewLayout.watch(async ({ sectionId }) => {
                this._currentLayout = { sectionId, layoutId: makeUuid() }
                this.unloadObjects()
                await this.loadSection(null)
                await this.loadSection(sectionId)
                events.setEditorReady(true)
            }),
            this._eventService.events$
                .pipe(
                    filter(e => e.type === 'documentUpdate'),
                    debounceTime(500)
                )
                .subscribe(() => {
                    const document = this.getDocument()
                    const { layoutId, sectionId } = this.currentLayout
                    // this._dataAccess.saveLayout({
                    //     sectionId,
                    //     layoutId,
                    //     document,
                    //     floorType: events.$editorState.getState().floorType,
                    // })
                }),
        ])
    }

    /**
     * @description Настройка событий редактора
     */
    private setupObjectEvents() {
        this._subscriptions.push(
            merge(
                this._eventService.mouseenter$.pipe(
                    filter(() => !this._isDragging),
                    tap(e => e.target.setHovered(true))
                ),
                this._eventService.mouseleave$.pipe(
                    tap(e => e.target.setHovered(false))
                )
            ).subscribe()
        )

        this._subscriptions.push(this._eventService.events$
            .pipe(filter(e => e.type === 'selectionChanged'))
            .subscribe(e => {
                events.selectionChanged(e.selectedObjects.map(serializeEditorObject).filter(notNull))
            })
        )

        // Drag sequence: mousedown -> mousemove (with threshold) -> drag operations -> mouseup
        const dragSequence$ = this._eventService.mousedown$.pipe(
            mergeMap(mouseDownEvent => {
                if (isUndefined(mouseDownEvent.target)) return EMPTY
                const startPos = aPoint(mouseDownEvent.pixiEvent.global)
                const dragConfig = this.createDragConfig(mouseDownEvent)

                return this._eventService.mousemoves$.pipe(
                    // Calculate distance from start position
                    map(mouseMoveEvent => ({
                        ...mouseMoveEvent,
                        distance: getLineLength({ start: startPos, end: mouseMoveEvent.pixiEvent.global }),
                        dragConfig
                    })),
                    // Only proceed once threshold is exceeded
                    filter(({ distance }) => distance >= EDITOR_CONFIG.INTERACTION.DRAG_THRESHOLD),
                    // Take the first move that exceeds threshold
                    take(1),
                    // Start the actual drag sequence
                    mergeMap(({ dragConfig }) => {
                        // Activate drag
                        this._isDragging = true
                        withDragOutline(dragConfig, x => this.stage.addChild(x))
                        return this._eventService.mousemoves$.pipe(
                            // Perform drag operations
                            tap(({ pixiEvent }) => this.performDrag(dragConfig, pixiEvent)),
                            // Continue until mouseup
                            takeUntil(this._eventService.mouseup$),
                            finalize(() => {
                                // Clean up on completion
                                this._isDragging = false
                                withDragOutline(dragConfig, x => this.stage.removeChild(x))
                                this.completeDrag(dragConfig)
                            })
                        )
                    }),
                    // Cancel if mouseup occurs before threshold is reached
                    takeUntil(this._eventService.mouseup$.pipe(
                        tap(() => {
                            // This was just a click, clean up the unused drag config
                            dragConfig.snapService.dispose()
                        })
                    ))
                )
            })
        )
        this._subscriptions.push(dragSequence$.subscribe())

        this._subscriptions.push(fromPixiEvent(this.stage, 'mousemove')
            .pipe(
                filter(e => e instanceof FederatedPointerEvent),
                map(pixiEvent => ({ type: 'mousemove', pixiEvent } as const))
            )
            .subscribe(e => this._eventService.emit(e)))

        this._subscriptions.push(fromPixiEvent(this.stage, 'mouseup')
            .pipe(map(e => ({ type: 'mouseup', pixiEvent: e } as const)))
            .subscribe(event => this._eventService.emit(event)))

        this._subscriptions.push(fromPixiEvent(assertDefined(this._viewportManager).viewport, 'mousedown')
            .pipe(map(pixiEvent => ({ type: 'mousedown', pixiEvent } as const)))
            .subscribe(event => this._eventService.emit(event)))
    }

    private unloadObjects() {
        const objects = [...this._editorObjects.values()]
        objects.forEach(o => {
            this.stage.removeChild(o.container)
            o.dispose()
        })
        this._editorObjects.clear()
    }

    private performDrag(dragConfig: DragConfig, pixiEvent: FederatedPointerEvent) {
        switch (dragConfig.type) {
            case 'dragBlock':
                this.dragBlock(dragConfig, pixiEvent)
                break
            case 'dragWall':
                this.dragWall(dragConfig, pixiEvent)
                break
            case 'dragWindow':
                this.dragWindow(dragConfig, pixiEvent)
                break
            default:
                assertUnreachable(dragConfig)
        }
    }

    private dragBlock(_dragConfig: BlockDragConfig, pixiEvent: FederatedPointerEvent) {
        const { target, snapService, dragOutline } = _dragConfig
        const toParentLocal = (point: APoint) => target.container.parent.toLocal(point)
        const toGlobal = (point: APoint) => target.container.parent.toGlobal(point)
        const delta = subtractVectors(pixiEvent.global, _dragConfig.startMousePos)
        const movedPoints = _dragConfig.originalGlobalPoints.map(p => addVectors(p, delta))
        const snapResult = snapService.checkOutlineSnap(movedPoints)
        snapService.showSnapIndicator(snapResult)

        const newPos = (() => {
            if (snapResult.snapped) {
                const globalTargetPos = subtractVectors(
                    addVectors(toGlobal(_dragConfig.startPos), delta),
                    subtractVectors(snapResult.originalPoint, snapResult.snapPoint)
                )
                return toParentLocal(globalTargetPos)
            } else {
                snapService.hideSnapIndicator()
                return toParentLocal(addVectors(toGlobal(_dragConfig.startPos), delta))
            }
        })()
        dragOutline.position.copyFrom(newPos)
    }

    private dragWall(_dragConfig: WallDragConfig, pixiEvent: FederatedPointerEvent) {
        const { target: wall, snapService } = _dragConfig
        const distance = distanceFromPointToLine(_dragConfig.originalWallGlobalLine, pixiEvent.global)
        const newLine = shiftLine(_dragConfig.originalWallGlobalLine, -1 * snapService.applyGridSnap(distance))
        const snapResult = snapService.checkLineSnap(newLine)
        snapService.showSnapIndicator(snapResult)
        if (snapResult.snapped) {
            const snapDistance = distanceFromPointToLine(_dragConfig.originalWallGlobalLine, snapResult.snapPoint)
            const snapLine = shiftLine(_dragConfig.originalWallGlobalLine, -snapDistance)
            wall.apartment.updateWall(wall, snapLine, 'global')
        } else {
            snapService.hideSnapIndicator()
            wall.apartment.updateWall(wall, newLine, 'global')
        }
    }

    private dragWindow(_dragConfig: WindowDragConfig, pixiEvent: FederatedPointerEvent) {
        const { startMousePos, originalCenterPoint, sectionOutlinePoints, dragOutline } = _dragConfig
        const delta = subtractVectors(pixiEvent.global, startMousePos)
        const newPosition = addVectors(originalCenterPoint, multiplyVector(delta, 1 / this.scale))
        const snappedPosition = snapWindowToOutline(newPosition, sectionOutlinePoints)
        dragOutline.position.copyFrom(snappedPosition)
    }

    private createDragConfig({ pixiEvent, target }: MouseDownEvent): DragConfig {
        assert(isDefined(target))
        if (target)
            if (target instanceof Apartment || target instanceof GeometryBlock) {
                const dragOutline = target.createDragOutline()
                const dragConfig: BlockDragConfig = {
                    type: 'dragBlock',
                    snapService: new SnapService(
                        this.stage,
                        this.getSnapPoints(),
                        this.getSnapLines()),
                    target,
                    startPos: aPoint(target.container.position),
                    startMousePos: aPoint(pixiEvent.global),
                    originalGlobalPoints: target.globalPoints.map(aPoint),
                    dragOutline,
                }
                return dragConfig
            } else if (target instanceof Wall) {
                const dragConfig: WallDragConfig = {
                    type: 'dragWall',
                    snapService: new SnapService(
                        this.stage,
                        this.getSnapPoints({ exclude: target.apartment }),
                        this.getSnapLines()),
                    target,
                    originalWallGlobalLine: target.globalPoints,
                    originalApartmentPoints: target.apartment.points
                }
                return dragConfig
            } else if (target instanceof WindowObj) {
                const dragOutline = target.createDragOutline()
                const dragConfig: WindowDragConfig = {
                    type: 'dragWindow',
                    snapService: new SnapService(
                        this.stage,
                        [],
                        []),
                    target,
                    startMousePos: aPoint(pixiEvent.global),
                    originalCenterPoint: aPoint(target.localPosition),
                    sectionOutlinePoints: this._sectionOutline?.points ?? [],
                    dragOutline,
                }
                return dragConfig
            }
        throw new LogicError('Didn\'t expect to get here')
    }

    private completeDrag(dragConfig: DragConfig) {
        dragConfig.snapService.dispose()
        const { type, target } = dragConfig
        switch (type) {
            case 'dragBlock':
                if (this._keyboardState.shift) {
                    const copy = target.clone()
                    copy.updatePosition(dragConfig.dragOutline.position)
                    this.executeCommand(new AddObjectCommand(this, copy))
                } else {
                    this.executeCommand(new MoveObjectCommand(
                        this,
                        dragConfig.target,
                        {
                            startPos: dragConfig.startPos,
                            endPos: aPoint(dragConfig.dragOutline.position)
                        }))
                }
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
                if (this._keyboardState.shift) {
                    const copy = target.clone()
                    copy.updatePosition(dragConfig.dragOutline.position)
                    this.executeCommand(new AddObjectCommand(this, copy))
                } else {
                    this.executeCommand(new MoveWindowCommand(
                        dragConfig.target,
                        {
                            startPos: dragConfig.originalCenterPoint,
                            endPos: aPoint(dragConfig.dragOutline.position)
                        }))
                }
                break
            default:
                assertUnreachable(type)
        }
        withDragOutline(dragConfig, dragOutline => {
            this.stage.removeChild(dragOutline)
            dragOutline.destroy({ children: true })
        })
    }

    private getSnapLines(options?: { exclude?: EditorObject }): ALine[] {
        const getLines = (o: EditorObject) => {
            if (o instanceof Apartment) return o.wallLines.map(mapLine(x => o.container.toGlobal(x)))
            if (o instanceof GeometryBlock) return o.globalLines
            if (o instanceof Wall) return []
            if (o instanceof WindowObj) return []
            throw new Error('Unknown object type')
        }
        const { _sectionOutline } = this
        return [
            ...(_sectionOutline ? pointsToLines(_sectionOutline.globalPoints) : []),
            ...this._editorObjects
                .values()
                .filter(x => x !== options?.exclude)
                .flatMap(getLines)
        ]
    }

    private getSnapPoints(options?: { exclude?: EditorObject }): APoint[] {
        const getPoints = (o: EditorObject) => {
            if (o instanceof Apartment) return o.globalPoints
            if (o instanceof GeometryBlock) return o.globalPoints
            if (o instanceof Wall) return []
            if (o instanceof WindowObj) return []
            throw new Error('Unknown object type')
        }
        const { _sectionOutline } = this
        return [
            ...(_sectionOutline ? _sectionOutline.globalPoints : []),
            ...this._editorObjects
                .values()
                .filter(x => x !== options?.exclude)
                .flatMap(getPoints)
        ]
    }

    public async dispose(): Promise<void> {
        this._logger.debug('dispose')
        this._selectionManager.dispose()
        this._keyboardState.dispose()
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
     * Загрузить секцию
     */
    public async loadSection(id: string | null) {
        if (isNull(id)) {
            const { _sectionOutline } = this
            if (notNull(_sectionOutline)) {
                this.stage.removeChild(_sectionOutline.container)
                _sectionOutline.dispose()
                this._sectionOutline = null
            }
        } else {
            const section = await this._dataAccess.getSection(id)
            assert(isNull(this._sectionOutline))
            this._sectionOutline = new SectionOutline(
                section.outline.map(mapPoint(Units.fromMm)),
                Units.fromMm(events.$sectionSettings.getState().offset)
            )
            this.stage.addChild(this._sectionOutline.container)
        }
        this.zoomToExtents()
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
        return assertDefined(this._editorObjects.get(id))
    }

    public deleteSelected() {
        this.executeCommand(new DeleteObjectsCommand(this, this._selectionManager.selectedObjects))
    }
}
