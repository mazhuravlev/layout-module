import { Apartment } from '../entities/Apartment'
import { Editor } from '../Editor/Editor'
import { EditorCommand } from './EditorCommand'

export class AddApartmentCommand implements EditorCommand {

    constructor(
        private _editor: Editor,
        private _apartment: Apartment
    ) {
    }

    execute(): void {
        this._editor.addApartment(this._apartment)
    }

    undo(): void {
        this._editor.deleteApartment(this._apartment)
    }


    dispose(): void {
        this._apartment.dispose()
    }
}