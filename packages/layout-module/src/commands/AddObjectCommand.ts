import { Editor } from '../Editor/Editor'
import { EditorCommand } from './EditorCommand'
import { EditorObject } from '../entities/EditorObject'

export class AddObjectCommand implements EditorCommand {

    constructor(
        private _editor: Editor,
        private _object: EditorObject
    ) {
    }

    execute(): void {
        this._editor.addObject(this._object)
    }

    undo(): void {
        this._editor.deleteObject(this._object)
    }


    dispose(): void {
        this._object.dispose()
    }
}