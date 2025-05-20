import { Apartment } from '../entities/Apartment'
import { Editor } from '../Editor/Editor'
import { APoint } from '../types'
import { EditorCommand } from './EditorCommand'

export class UpdateAppartmentPointsCommand implements EditorCommand {

    constructor(
        private _editor: Editor,
        private _apartment: Apartment,
        private _config: {
            newPoints: APoint[],
            originalPoints: APoint[],
        }
    ) {
    }

    execute(): void {
        this._apartment.updatePoints(this._config.newPoints)
    }

    undo(): void {
        this._apartment.updatePoints(this._config.originalPoints)
    }

    dispose(): void {
    }
}