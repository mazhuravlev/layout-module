import { switchMap, filter, take, timeout, map, catchError, of } from 'rxjs'
import { EditorObject } from '../entities/EditorObject'
import { EventService } from '../EventService/EventService'
import { MouseDownEvent } from '../EventService/eventTypes'
import { SelectionManager } from './SelectionManager'
import { EDITOR_CONFIG } from './editorConfig'
import { not } from '../func'

export class MouseEventProcessor {
    constructor(
        private eventService: EventService,
        private selectionManager: SelectionManager,
        private onObjectSelected: () => void
    ) { }

    public setupClickHandling() {
        return this.eventService.mousedown$
            .pipe(
                switchMap((downEvent) => this.processMouseDown(downEvent)),
                filter(result => result !== null)
            )
            .subscribe(result => this.handleClick(result!))
    }

    private processMouseDown(downEvent: MouseDownEvent) {
        const isCtrlPressed = downEvent.pixiEvent.ctrlKey || downEvent.pixiEvent.metaKey
        const isShiftPressed = downEvent.pixiEvent.shiftKey

        return this.eventService.mouseup$.pipe(
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

        if (ctrlKey || shiftKey) {
            this.handleMultiSelect(target)
        } else {
            this.handleSingleSelect(target)
        }

        this.onObjectSelected()
    }

    private handleSingleSelect(target: EditorObject) {
        this.selectionManager.deselectAll()
        this.selectionManager.selectObject(target)
        target.container.parent.addChild(target.container) // bring to front
    }

    private handleMultiSelect(target: EditorObject) {
        if (this.selectionManager.has(target)) {
            this.selectionManager.deselectObject(target)
        } else {
            this.selectionManager.selectObject(target)
        }
    }
}