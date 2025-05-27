import { Apartment } from '../entities/Apartment'
import { EditorObject } from '../entities/EditorObject'
import { WindowObj } from '../entities/Window'

export class SelectionManager {
    private _selectedObjects = new Set<EditorObject>()

    public get selectedObjects() { return [...this._selectedObjects] }

    public get selectedApartments(): Apartment[] {
        return this.selectedObjects.filter(x => x instanceof Apartment)
    }

    public get selectedWindows(): WindowObj[] {
        return this.selectedObjects.filter(obj => obj instanceof WindowObj)
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
}