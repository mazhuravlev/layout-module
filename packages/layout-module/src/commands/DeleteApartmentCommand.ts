import { EditorCommand } from './EditorCommand'
import { Editor } from '../Editor/Editor'
import { Apartment } from '../entities/Apartment'

export class DeleteApartmentsCommand implements EditorCommand {

    constructor(
        private _editor: Editor,
        private _apartments: Apartment[]) {
    }

    execute(): void {
        this._apartments.forEach(apartment => this._editor.deleteApartment(apartment))
    }

    undo(): void {
        this._apartments.forEach(apartment => this._editor.addApartment(apartment))
    }

    dispose(): void {
        this._apartments.forEach(apartment => apartment.dispose())
    }
}
