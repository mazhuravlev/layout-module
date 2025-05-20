import { Apartment } from '../entities/Apartment'
import { Editor } from '../Editor/Editor'
import { APoint } from '../types'
import { EditorCommand } from './EditorCommand'

export class MoveAppartmentCommand implements EditorCommand {

    constructor(
        private _editor: Editor,
        private _apartment: Apartment,
        private _config: {
            startPos: APoint,
            endPos: APoint,
        }
    ) {
    }

    execute(): void {
        const { x, y } = this._config.endPos
        this._apartment.container.position.set(x, y)
    }

    undo(): void {
        const { x, y } = this._config.startPos
        this._apartment.container.position.set(x, y)
    }


    dispose(): void {
    }
}