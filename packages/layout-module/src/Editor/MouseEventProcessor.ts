import { switchMap, filter, take, timeout, map, catchError, of } from 'rxjs'
import { EditorObject } from '../entities/EditorObject'
import { EventService } from '../EventService/EventService'
import { MouseDownEvent } from '../EventService/eventTypes'
import { EDITOR_CONFIG } from './editorConfig'
import { not } from '../func'
import { mergeMap, takeUntil, tap, finalize } from 'rxjs'
import { aPoint } from '../geometryFunc'
import { getLineLength } from '../geometryFunc'
import { APoint } from '../types'
import { Container } from 'pixi.js'
import { SelectionFrame } from './SelectionFrame'

interface FrameSelectionConfig {
    startPoint: APoint
    currentPoint: APoint
    isLeftToRight: boolean
    selectionFrame: SelectionFrame
}

export class MouseEventProcessor {
    constructor(
        private _eventService: EventService,
        private _getStage: () => Container,
    ) { }

    public setupClickHandling() {
        return this._eventService.mousedown$
            .pipe(
                switchMap((downEvent) => this.processMouseDown(downEvent)),
                filter(result => result !== null)
            )
            .subscribe(result => this.handleClick(result!))
    }

    private processMouseDown(downEvent: MouseDownEvent) {
        const isCtrlPressed = downEvent.pixiEvent.ctrlKey || downEvent.pixiEvent.metaKey
        const isShiftPressed = downEvent.pixiEvent.shiftKey

        return this._eventService.mouseup$.pipe(
            take(1),
            timeout(EDITOR_CONFIG.INTERACTION.CLICK_TIMEOUT),
            filter((upEvent) => upEvent.target === downEvent.target),
            map((upEvent) => ({
                target: upEvent.target,
                ctrlKey: isCtrlPressed,
                shiftKey: isShiftPressed,
            })),
            catchError(() => of(null))
        )
    }

    private handleClick(clickEvent: { target: unknown, ctrlKey: boolean, shiftKey: boolean }) {
        const { target, ctrlKey, shiftKey } = clickEvent

        if (!(target instanceof EditorObject)) return
        if (not(target.isSelectable)) return

        this._eventService.emit({
            type: 'selectionClick',
            ctrlKey,
            shiftKey,
            target,
        })
    }

    public setupFrameSelection() {
        return this._eventService.mousedown$
            .pipe(
                // Only process mousedown events that don't hit any object
                filter((downEvent) => !downEvent.target),
                mergeMap((downEvent) => {
                    const startPointGlobal = aPoint(downEvent.pixiEvent.global)
                    const startPointWorld = aPoint(this._getStage().toLocal(startPointGlobal))

                    return this._eventService.mousemoves$.pipe(
                        // Calculate distance from start position in screen coordinates
                        map(mouseMoveEvent => ({
                            ...mouseMoveEvent,
                            distance: getLineLength({
                                start: startPointGlobal,
                                end: aPoint(mouseMoveEvent.pixiEvent.global)
                            })
                        })),
                        // Only proceed once threshold is exceeded
                        filter(({ distance }) => distance >= EDITOR_CONFIG.INTERACTION.DRAG_THRESHOLD),
                        // Take the first move that exceeds threshold
                        take(1),
                        // Start the actual frame selection sequence
                        mergeMap(() => {
                            // Create frame selection visual feedback using world coordinates
                            const selectionFrame = new SelectionFrame(startPointWorld)
                            const frameConfig: FrameSelectionConfig = {
                                startPoint: startPointWorld,
                                currentPoint: startPointWorld,
                                isLeftToRight: true,
                                selectionFrame
                            }

                            this.onFrameSelectionStart(frameConfig)

                            return this._eventService.mousemoves$.pipe(
                                // Update frame selection
                                tap(({ pixiEvent }) => {
                                    const currentPointGlobal = aPoint(pixiEvent.global)
                                    const currentPointWorld = aPoint(this._getStage().toLocal(currentPointGlobal))

                                    frameConfig.currentPoint = currentPointWorld
                                    frameConfig.isLeftToRight = currentPointWorld.x >= frameConfig.startPoint.x
                                    this.onFrameSelectionUpdate(frameConfig)
                                }),
                                // Continue until mouseup
                                takeUntil(this._eventService.mouseup$),
                                finalize(() => {
                                    this.onFrameSelectionComplete(frameConfig)
                                })
                            )
                        }),
                        // Cancel if mouseup occurs before threshold is reached
                        takeUntil(
                            this._eventService.mouseup$.pipe(
                                tap(() => {
                                    // Выполняем deselectAll когда mouseup происходит до достижения threshold
                                    this._eventService.emit({ type: 'deselectAll' })
                                })
                            )
                        )
                    )
                })
            )
            .subscribe()
    }

    private onFrameSelectionStart(config: FrameSelectionConfig) {
        this._getStage().addChild(config.selectionFrame.container)
    }

    private onFrameSelectionUpdate(config: FrameSelectionConfig) {
        config.selectionFrame.update(config.currentPoint)
    }

    private onFrameSelectionComplete(config: FrameSelectionConfig) {
        const { selectionFrame } = config
        this._eventService.emit({
            type: 'selectionFrame',
            selectionType: config.isLeftToRight ? 'window' : 'crossing',
            bounds: selectionFrame.globalBounds,
        })
        selectionFrame.dispose()
    }
} 