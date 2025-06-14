import { Application, FederatedPointerEvent } from 'pixi.js'
import { distanceFromPointToLine, getLineLength, pointsToLines, shiftLine } from '../geometryFunc'
import { Logger } from '../logger'
import type { ALine, APoint, ASubscription, EditorDocument, FloorType, LLUTemplate } from '../types'
import { InvalidOperation, LogicError, unsubscribe } from '../types'
import { addVectors, aPoint, mapLine, mapPoint, subtractVectors } from '../geometryFunc'
import type { BlockDragConfig, DragConfig, WallDragConfig, WindowDragConfig } from './dragConfig'
import { withDragOutline } from './dragConfig'
import { Apartment } from '../entities/Apartment'
import { EventService } from '../EventService/EventService'
import * as events from '../events'
import { assert, assertDefined, assertUnreachable, empty, isNull, notNull, toError, fromPixiEvent, isDefined, isUndefined, makeUuid, not } from '../func'
import type { MouseDownEvent } from '../EventService/eventTypes'
import { debounceTime, EMPTY, filter, finalize, map, merge, mergeMap, take, takeUntil, tap } from 'rxjs'
import { SnapService } from './SnapService'
import type { EditorCommand } from '../commands/EditorCommand'
import { AddObjectCommand } from '../commands/AddObjectCommand'
import { DeleteObjectsCommand } from '../commands/DeleteObjectsCommand'
import { MoveObjectCommand } from '../commands/MoveObjectCommand'
import { UpdateApartmentPointsCommand } from '../commands/UpdateApartmentPointsCommand'
import { initDevtools } from '@pixi/devtools'
import { Wall } from '../entities/Wall'
import { UpdateApartmentPropertiesCommand } from '../commands/UpdateApartmentPropertiesCommand'
import { LLU } from '../entities/LLU'
import type { EditorObject } from '../entities/EditorObject'
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
import type { DataAccess } from '../DataAccess/DataAccess'
import { EntityDtoArray } from './dtoSchema'
import type { EditorObjectDto } from './dto'
import * as geometryFunc from '../geometryFunc'
import { BatchCommand } from '../commands/BatchCommand'

const COPIED_OBJECTS_KEY = 'copiedObjects.v1'

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

    private _currentLayout: EditorDocument | null = null

    private _LLUTemplates = new Map<string, LLUTemplate>()

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
            () => [...this._editorObjects.values()],
        )
        this._mouseEventProcessor = new MouseEventProcessor(
            this._eventService,
            () => this.stage,
        )
    }

    public get currentFloorType(): FloorType {
        return events.$editorState.getState().floorType
    }

    private get stage() {
        return assertDefined(this._viewportManager).stage
    }

    public get viewport() {
        return assertDefined(this._viewportManager)
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
        this._LLUTemplates = new Map((await this._dataAccess.getLLUs())
            .map(llu => {
                const template: LLUTemplate = {
                    ...llu,
                    outline: llu.outline.map(mapPoint(Units.fromMm)),
                    geometry: llu.geometry.map(x => x.map(mapPoint(Units.fromMm))),
                }
                return [llu.id, template] as const
            }))
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

    private cloneEditorObject(object: EditorObject) {
        if (not(object.serializable)) throw new InvalidOperation()
        const data = object.serialize()
        const clone = this.createEditorObjectFromDto({ ...data, id: makeUuid() })
        return clone
    }

    private createEditorObjectFromDto(dto: EditorObjectDto): EditorObject {
        switch (dto.type) {
            case 'apartment':
                return Apartment.deserialize(this.eventService, dto)
            case 'window':
                return WindowObj.deserialize(this.eventService, dto)
            case 'llu':
                return LLU.deserialize(this.eventService, dto, assertDefined(this._LLUTemplates.get(dto.templateId)))
            default:
                throw assertUnreachable(dto)
        }
    }

    public async populateEditorObjects(floorType: FloorType) {
        const floor = assertDefined(this.currentLayout.floors.find(x => x.type === floorType))
        const editorObjects = floor.objects.map(x => this.createEditorObjectFromDto(x))
        new AddObjectCommand(this, editorObjects).execute()
    }

    private setupEvents() {
        this._subscriptions.push(...[
            events.addApartment.watch((shape) => {
                this.executeCommand(new AddObjectCommand(
                    this,
                    new Apartment(this._eventService, shape.points.map(mapPoint(Units.fromMm)))))
            }),
            events.addLLU.watch(id => {
                const template = assertDefined(this._LLUTemplates.get(id))
                this.executeCommand(new AddObjectCommand(this, new LLU(this._eventService, template)))
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
                    options,
                )
                this.executeCommand(new AddObjectCommand(this, windows))
            }),
            events.setWindowProperties.watch((properties) => {
                const { selectedWindows } = this._selectionManager
                if (empty(selectedWindows)) return
                this.executeCommand(new UpdateWindowPropertiesCommand(selectedWindows, properties))
                this._selectionManager.update()
            }),
            events.selectFloorType.watch((floorType) => {
                this.switchFloorType(floorType)
            }),
            events.createNewLayout.watch(async ({ sectionId, name }) => {
                await this.createNewLayout(sectionId, name)
            }),
            events.loadLayout.watch(({ layoutId }) => this.loadLayout(layoutId)),
            events.copySelected.watch(() => this.copySelected()),
            events.pasteObjects.watch(() => this.pasteObjects()),
            this._eventService.events$
                .pipe(
                    filter(e => e.type === 'documentUpdate'),
                    debounceTime(300),
                    tap(() => this.updateDocument()),
                    map(() => this.currentLayout),
                )
                .subscribe(doc => this.saveLayout(doc)),
        ])
    }

    private pasteObjects() {
        const jsonString = localStorage.getItem(COPIED_OBJECTS_KEY)
        if (jsonString === null) return
        const { success, data } = EntityDtoArray.safeParse(JSON.parse(jsonString))
        if (success && data) {
            const objects = data.map(x => this.createEditorObjectFromDto({ ...x, id: makeUuid() }))
            this.executeCommand(new AddObjectCommand(this, objects))
        }
    }

    private copySelected() {
        const { selectedObjects } = this._selectionManager
        if (empty(selectedObjects)) return
        const dto = selectedObjects
            .filter(x => x.serializable)
            .map(x => x.serialize())
        localStorage.setItem(COPIED_OBJECTS_KEY, JSON.stringify(dto))
    }

    private async saveLayout(doc: EditorDocument) {
        await this._dataAccess.saveLayout(doc)
    }

    private async createNewLayout(sectionId: string, name: string) {
        const layoutId = makeUuid()
        this._currentLayout = {
            sectionId,
            name,
            layoutId,
            floors: [
                { type: 'first', objects: [] },
                { type: 'typical', objects: [] },
            ],
        }
        this.unloadObjects()
        await this.unloadSection()
        await this.loadSection(sectionId)
        await this.saveLayout(this._currentLayout)
        const section = await this._dataAccess.getSection(sectionId)
        events.setCurrentLayout({
            sectionId,
            layoutId,
            minFloors: section.minFloors,
            maxFloors: section.maxFloors,
        })
        events.setEditorReady(true)
    }

    async switchFloorType(floorType: FloorType) {
        events.setFloorType(floorType)
        this._selectionManager.deselectAll()
        this.unloadObjects()
        this.populateEditorObjects(floorType)
        // TODO: почему обьекты не добавлятюся синхронно, сразу?
        setTimeout(() => this.zoomToExtents(), 10)
    }

    private async loadLayout(id: string) {
        events.setEditorReady(false)
        this._selectionManager.deselectAll()
        this.unloadSection()
        this.unloadObjects()
        const layout = await this._dataAccess.getLayout(id)
        await this.loadSection(layout.sectionId)
        this._currentLayout = layout
        this.populateEditorObjects(this.currentFloorType)
        const section = await this._dataAccess.getSection(layout.sectionId)
        events.setCurrentLayout({
            sectionId: layout.sectionId,
            layoutId: layout.layoutId,
            minFloors: section.minFloors,
            maxFloors: section.maxFloors,
        })
        events.setEditorReady(true)
        // TODO: почему обьекты не добавлятюся синхронно, сразу?
        setTimeout(() => this.zoomToExtents(), 10)
    }

    private updateDocument(): void {
        const objects = [...this._editorObjects.values()]
            .map(x => x.serialize())
            .filter(notNull)
        const type = this.currentFloorType
        assert(assertDefined(this._currentLayout).floors.filter(x => x.type === type).length === 1)
        this._currentLayout = {
            ...this.currentLayout,
            floors: this.currentLayout.floors
                .map(x => x.type === type ? { type, objects } : x),
        }
    }

    /**
     * @description Настройка событий редактора
     */
    private setupObjectEvents() {
        this._subscriptions.push(
            merge(
                this._eventService.mouseenter$.pipe(
                    filter(() => !this._isDragging),
                    tap(e => e.target.setHovered(true)),
                ),
                this._eventService.mouseleave$.pipe(
                    tap(e => e.target.setHovered(false)),
                ),
            ).subscribe(),
        )

        this._subscriptions.push(this._eventService.events$
            .pipe(filter(e => e.type === 'selectionChanged'))
            .subscribe(e => {
                const selection = e.selectedObjects
                    .filter(x => x.serializable)
                    .map(x => x.serialize()!)
                events.selectionChanged(selection)
            }),
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
                        dragConfig,
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
                            tap(({ pixiEvent }) => this.performDrag(
                                dragConfig,
                                this.viewport.pointToStage(pixiEvent.global),
                            )),
                            // Continue until mouseup
                            takeUntil(this._eventService.mouseup$),
                            finalize(() => {
                                // Clean up on completion
                                this._isDragging = false
                                withDragOutline(dragConfig, x => this.stage.removeChild(x))
                                this.completeDrag(dragConfig)
                            }),
                        )
                    }),
                    // Cancel if mouseup occurs before threshold is reached
                    takeUntil(this._eventService.mouseup$.pipe(
                        tap(() => {
                            // This was just a click, clean up the unused drag config
                            dragConfig.snapService.dispose()
                        }),
                    )),
                )
            }),
        )
        this._subscriptions.push(dragSequence$.subscribe())

        this._subscriptions.push(fromPixiEvent(this.stage, 'mousemove')
            .pipe(
                filter(e => e instanceof FederatedPointerEvent),
                map(pixiEvent => ({ type: 'mousemove', pixiEvent } as const)),
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

    /**
     * 
     * @param dragConfig 
     * @param mousePos в координатах stage
     */
    private performDrag(dragConfig: DragConfig, mousePos: APoint) {
        switch (dragConfig.type) {
            case 'dragBlock':
                this.dragBlock(dragConfig, mousePos)
                break
            case 'dragWall':
                this.dragWall(dragConfig, mousePos)
                break
            case 'dragWindow':
                this.dragWindow(dragConfig, mousePos)
                break
            default:
                assertUnreachable(dragConfig)
        }
    }

    private dragBlock(_dragConfig: BlockDragConfig, mousePos: APoint) {
        const { snapService, dragOutline, startMousePos, originalPoints, startPos } = _dragConfig
        const delta = subtractVectors(mousePos, startMousePos)
        const movedPoints = originalPoints.map(p => addVectors(p, delta))
        const snapResult = snapService.checkOutlineSnap(movedPoints)
        snapService.showSnapIndicator(snapResult)
        const newPos = (() => {
            if (snapResult.snapped) {
                return subtractVectors(
                    addVectors(startPos, delta),
                    subtractVectors(snapResult.originalPoint, snapResult.snapPoint),
                )
            } else {
                return addVectors(startPos, delta)
            }
        })()
        dragOutline.position.copyFrom(newPos)
    }

    private dragWall(_dragConfig: WallDragConfig, mousePos: APoint) {
        const { target: wall, snapService, originalWallLine } = _dragConfig
        const inputDistance = snapService.applyGridSnap(
            distanceFromPointToLine(originalWallLine, mousePos))
        const snapResult = snapService.checkLineSnap(
            shiftLine(originalWallLine, -1 * inputDistance))
        snapService.showSnapIndicator(snapResult)
        const resultDistance = snapResult.snapped
            ? distanceFromPointToLine(originalWallLine, snapResult.snapPoint)
            : inputDistance
        const newLine = shiftLine(originalWallLine, -1 * resultDistance)
        const updateWall = (wall: Wall, stageLine: ALine) => {
            wall.apartment.updateWall(wall, this.viewport.lineToGlobal(stageLine))
        }
        _dragConfig.adjacentWalls.forEach(({ wall, originalWallLine, sameDirection }) => {
            const direction = sameDirection ? -1 : 1
            const newLine = shiftLine(originalWallLine, direction * resultDistance)
            updateWall(wall, newLine)
        })
        updateWall(wall, newLine)
    }

    private dragWindow(_dragConfig: WindowDragConfig, mousePos: APoint) {
        const { startMousePos, originalCenterPoint, sectionOutlinePoints, dragOutline } = _dragConfig
        const delta = subtractVectors(mousePos, startMousePos)
        const newPosition = addVectors(originalCenterPoint, delta)
        const snappedPosition = snapWindowToOutline(newPosition, sectionOutlinePoints)
        dragOutline.position.copyFrom(snappedPosition)
    }

    private createDragConfig({ pixiEvent, target }: MouseDownEvent): DragConfig {
        assert(isDefined(target))
        if (target) {
            const startMousePos = this.viewport.pointToStage(pixiEvent.global)
            if (target instanceof Apartment || target instanceof LLU) {
                const dragOutline = target.createDragOutline()
                const excludeConfig = events.$snapConfig.getState().snapToSelf
                    ?
                    undefined
                    : { exclude: target }
                const dragConfig: BlockDragConfig = {
                    type: 'dragBlock',
                    snapService: new SnapService(
                        // TODO конвертировать в координаты stage
                        this.stage,
                        this.getSnapPoints(excludeConfig),
                        this.getSnapLines(excludeConfig)),
                    target,
                    startPos: this.viewport.pointToStage(target.container.getGlobalPosition()),
                    startMousePos,
                    originalPoints: this.viewport.pointsToStage(target.globalPoints),
                    dragOutline,
                }
                return dragConfig
            } else if (target instanceof Wall) {
                const dragConfig: WallDragConfig = {
                    type: 'dragWall',
                    snapService: new SnapService(
                        // TODO конвертировать в координаты stage
                        this.stage,
                        this.getSnapPoints({ exclude: target.apartment }),
                        this.getSnapLines()),
                    target,
                    originalWallLine: this.viewport.lineToStage(target.globalLine),
                    originalApartmentPoints: target.apartment.points,
                    adjacentWalls: events.$snapConfig.getState().syncWalls
                        ? this.findAdjacentWalls(target)
                        : [],
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
                    startMousePos,
                    originalCenterPoint: aPoint(target.localPosition),
                    // TODO убрать sectionOutlinePoints
                    sectionOutlinePoints: assertDefined(this._sectionOutline).points,
                    dragOutline,
                }
                return dragConfig
            }
        }
        throw new LogicError('Didn\'t expect to get here')
    }

    private findAdjacentWalls(target: Wall): WallDragConfig['adjacentWalls'] {
        return Array.from(this._editorObjects.values())
            .filter(x => x instanceof Apartment)
            .filter(x => x !== target.apartment)
            .flatMap(apartment => {
                for (const wall of apartment.walls) {
                    if (geometryFunc.doLinesShareSegment(target.globalLine, wall.globalLine)) {
                        return [{
                            wall,
                            originalWallLine: this.viewport.lineToStage(wall.globalLine),
                            originalApartmentPoints: apartment.points,
                            sameDirection: geometryFunc.areLinesSameDirection(target.globalLine, wall.globalLine),
                        }]
                    }
                }
                return []
            })
    }

    private completeDrag(dragConfig: DragConfig) {
        dragConfig.snapService.dispose()
        const { type, target } = dragConfig
        switch (type) {
            case 'dragBlock':
                if (this._keyboardState.shift) {
                    const copy = this.cloneEditorObject(target) as (Apartment | LLU)
                    copy.updatePosition(dragConfig.dragOutline.position)
                    this.executeCommand(new AddObjectCommand(this, copy))
                } else {
                    this.executeCommand(new MoveObjectCommand(
                        dragConfig.target,
                        {
                            startPos: dragConfig.startPos,
                            endPos: aPoint(dragConfig.dragOutline.position),
                        }))
                }
                break
            case 'dragWall':
                this.executeCommand(new BatchCommand(
                    [new UpdateApartmentPointsCommand(
                        dragConfig.target.apartment,
                        {
                            originalPoints: dragConfig.originalApartmentPoints,
                            newPoints: dragConfig.target.apartment.points,
                        }),
                    ...dragConfig.adjacentWalls.map(x => new UpdateApartmentPointsCommand(
                        x.wall.apartment,
                        {
                            originalPoints: x.originalApartmentPoints,
                            newPoints: x.wall.apartment.points,
                        }))]))
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
                            endPos: aPoint(dragConfig.dragOutline.position),
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
            if (o instanceof Apartment) return this.viewport.linesToStage(
                o.wallLines.map(mapLine(x => o.container.toGlobal(x))))
            if (o instanceof LLU) return this.viewport.linesToStage(o.globalLines)
            if (o instanceof Wall) return []
            if (o instanceof WindowObj) return []
            throw new Error('Unknown object type')
        }
        return [
            ...(this.viewport.linesToStage(pointsToLines(assertDefined(this._sectionOutline).globalPoints))),
            ...[...this._editorObjects.values()]
                .filter(x => x !== options?.exclude)
                .flatMap(getLines),
        ]
    }

    private getSnapPoints(options?: { exclude?: EditorObject }): APoint[] {
        const getPoints = (o: EditorObject) => {
            if (o instanceof Apartment) return this.viewport.pointsToStage(o.globalPoints)
            if (o instanceof LLU) return this.viewport.pointsToStage(o.globalPoints)
            if (o instanceof Wall) return []
            if (o instanceof WindowObj) return []
            throw new Error('Unknown object type')
        }
        return [
            ...this.viewport.pointsToStage(assertDefined(this._sectionOutline).globalPoints),
            ...[...this._editorObjects.values()]
                .filter(x => x !== options?.exclude)
                .flatMap(getPoints),
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
    public async loadSection(id: string) {
        const section = await this._dataAccess.getSection(id)
        assert(isNull(this._sectionOutline))
        this._sectionOutline = new SectionOutline(
            section.outline.map(mapPoint(Units.fromMm)),
            Units.fromMm(events.$sectionSettings.getState().offset),
        )
        this.stage.addChild(this._sectionOutline.container)
        this.zoomToExtents()
    }

    public async unloadSection() {
        const { _sectionOutline } = this
        if (notNull(_sectionOutline)) {
            this.stage.removeChild(_sectionOutline.container)
            _sectionOutline.dispose()
            this._sectionOutline = null
        }
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
