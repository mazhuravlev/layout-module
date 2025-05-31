import { filter } from 'rxjs'
import { Apartment } from '../entities/Apartment'
import { EditorObject } from '../entities/EditorObject'
import { WindowObj } from '../entities/Window'
import { EventService } from '../EventService/EventService'
import { ASubscription, IDisposable, unsubscribe } from '../types'
import { Bounds } from 'pixi.js'

export class SelectionManager implements IDisposable {
    private _selectedObjects = new Set<EditorObject>()

    private _subscriptions: ASubscription[] = []

    constructor(
        private _eventService: EventService,
        private _getObjects: () => EditorObject[],
    ) {
        this._subscriptions.push(_eventService.events$
            .pipe(filter(e => e.type === 'selectionFrame'))
            .subscribe(e => this.handleSelectionFrame(e.bounds, e.selectionType)))
    }

    public get selectedObjects() { return [...this._selectedObjects] }

    public get selectedApartments(): Apartment[] {
        return this.selectedObjects.filter(x => x instanceof Apartment)
    }

    public get selectedWindows(): WindowObj[] {
        return this.selectedObjects.filter(obj => obj instanceof WindowObj)
    }

    private handleSelectionFrame(bounds: Bounds, selectionType: 'window' | 'crossing') {
        const selected = this._getObjects()
            .filter(x => x.intersectFrame(bounds, selectionType))
        this.deselectAll()
        this.selectObjects(selected)
    }


    public selectObject(object: EditorObject) {
        this._selectedObjects.add(object)
        object.setSelected(true)
    }

    public deselectObject(object: EditorObject) {
        this._selectedObjects.delete(object)
        object.setSelected(false)
    }

    public deselectAll() {
        this._selectedObjects.forEach(x => x.setSelected(false))
        this._selectedObjects.clear()
    }

    public selectObjects(objects: EditorObject[]) {
        this.deselectAll()
        objects.forEach(this.selectObject.bind(this))
    }

    public has(object: EditorObject): boolean {
        return this._selectedObjects.has(object)
    }

    public dispose(): void {
        this._subscriptions.forEach(unsubscribe)
    }
}