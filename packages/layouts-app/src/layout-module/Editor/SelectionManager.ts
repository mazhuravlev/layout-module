import { filter } from 'rxjs'
import { Apartment } from '../entities/Apartment'
import type { EditorObject } from '../entities/EditorObject'
import { WindowObj } from '../entities/Window'
import type { EventService } from '../EventService/EventService'
import type { ASubscription, IDisposable } from '../types'
import { unsubscribe } from '../types'
import type { Bounds } from 'pixi.js'
import { wrapArray } from '../func'

export class SelectionManager implements IDisposable {
    private _selectedObjects = new Set<EditorObject>()

    private _subscriptions: ASubscription[] = []

    constructor(
        private _eventService: EventService,
        private _getObjects: () => EditorObject[],
    ) {
        this.init()
    }

    private init() {
        const { _eventService } = this
        this._subscriptions.push(...[
            _eventService.events$
                .pipe(filter(e => e.type === 'selectionFrame'))
                .subscribe(e => this.handleSelectionFrame(e.bounds, e.selectionType)),
            _eventService.events$
                .pipe(filter(e => e.type === 'deselectAll'))
                .subscribe(() => this.deselectAll()),
            _eventService.events$
                .pipe(filter(e => e.type === 'selectionClick'))
                .subscribe(({ target, ctrlKey, shiftKey }) => {
                    if (ctrlKey || shiftKey) {
                        if (this.has(target)) {
                            this.deselectObjects(target)
                        } else {
                            this.selectObjects(target)
                        }
                    } else {
                        this.deselectAll()
                        this.selectObjects(target)
                    }
                }),
        ])
    }

    public get selectedObjects() { return [...this._selectedObjects] }

    public get selectedApartments(): Apartment[] {
        return this.selectedObjects.filter(x => x instanceof Apartment)
    }

    public get selectedWindows(): WindowObj[] {
        return this.selectedObjects.filter(obj => obj instanceof WindowObj)
    }

    public update() {
        this.emitSelectionChanged()
    }

    private emitSelectionChanged() {
        this._eventService.emit({
            type: 'selectionChanged',
            selectedObjects: this.selectedObjects,
        })
    }

    private handleSelectionFrame(bounds: Bounds, selectionType: 'window' | 'crossing') {
        const selected = this._getObjects()
            .filter(x => x.intersectFrame(bounds, selectionType))
        this.deselectAll()
        this.selectObjects(selected)
    }

    public deselectObjects(object: EditorObject | EditorObject[]) {
        const objects = wrapArray(object)
        objects.forEach(o => {
            this._selectedObjects.delete(o)
            o.setSelected(false)
        })
        this.emitSelectionChanged()
    }

    public deselectAll() {
        this._selectedObjects.forEach(x => x.setSelected(false))
        this._selectedObjects.clear()
        this.emitSelectionChanged()
    }

    public selectObjects(object: EditorObject | EditorObject[]) {
        const objects = wrapArray(object)
        objects.forEach(o => {
            this._selectedObjects.add(o)
            o.setSelected(true)
        })
        this.emitSelectionChanged()
    }

    public has(object: EditorObject): boolean {
        return this._selectedObjects.has(object)
    }

    public dispose(): void {
        this._subscriptions.forEach(unsubscribe)
    }
}