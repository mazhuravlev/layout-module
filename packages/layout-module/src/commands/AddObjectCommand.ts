import { Editor } from '../Editor/Editor'
import { EditorCommand } from './EditorCommand'
import { EditorObject } from '../entities/EditorObject'

export class AddObjectCommand implements EditorCommand {
    private _objects: EditorObject[]

    constructor(
        private _editor: Editor,
        object: EditorObject | EditorObject[]
    ) {
        this._objects = object instanceof Array ? object : [object]
    }

    execute(): void {
        this._objects.forEach(x => this._editor.addObject(x))
    }

    undo(): void {
        this._objects.forEach(x => this._editor.deleteObject(x))
    }


    dispose(): void {
        // Команда не владеет объектами, редактор управляет их жизненным циклом
        // Поэтому явное удаление здесь не требуется
        // this._objects.forEach(x => x.dispose())
    }
}