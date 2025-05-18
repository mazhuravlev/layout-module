import { EditorCommand } from './EditorCommand'
import { Editor } from '../Editor/Editor'
import { Apartment } from '../Editor/Apartment'

export class DeleteApartmentCommand implements EditorCommand {

    constructor(
        private _editor: Editor,
        private _apartment: Apartment) {
    }

    execute(): void {
        this._editor.deleteApartment(this._apartment)
    }

    undo(): void {
        this._editor.addApartment(this._apartment)
    }

    dispose(): void {
        this._apartment.dispose()
    }
}
