import { Editor } from '../Editor/Editor'
import { APoint } from '../types'
import { EditorCommand } from './EditorCommand'
import { EditorObject } from '../entities/EditorObject'

export class MoveObjectCommand implements EditorCommand {

    public get description() { return 'Переместить' }

    constructor(
        private _editor: Editor,
        private _object: EditorObject,
        private _config: {
            startPos: APoint,
            endPos: APoint,
        }
    ) {
    }

    execute(): void {
        const { x, y } = this._config.endPos
        this._object.container.position.set(x, y)
    }

    undo(): void {
        const { x, y } = this._config.startPos
        this._object.container.position.set(x, y)
    }


    dispose(): void {
    }
}