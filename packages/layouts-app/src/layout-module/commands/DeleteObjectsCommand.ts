import type { EditorCommand } from './EditorCommand'
import type { Editor } from '../Editor/Editor'
import type { EditorObject } from '../entities/EditorObject'

export class DeleteObjectsCommand implements EditorCommand {

    public get description() { return 'Удалить' }

    constructor(
        private _editor: Editor,
        private _objects: EditorObject[]) {
    }

    execute(): void {
        this._editor.deselectAll()
        this._objects.forEach(o => this._editor.deleteObject(o))
    }

    undo(): void {
        this._objects.forEach(o => this._editor.addObject(o))
        this._editor.selectObjects(this._objects)
    }

    dispose(): void {
        this._objects.forEach(o => o.dispose())
    }
}
