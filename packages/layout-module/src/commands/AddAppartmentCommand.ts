import { Apartment } from '../Editor/Apartment'
import { Editor } from '../Editor/Editor'
import { APoint } from '../Editor/types'
import { EditorCommand } from './EditorCommand'

export class AddApartmentCommand implements EditorCommand {
    private apartmentId: string | null = null

    constructor(
        private editor: Editor,
        private points: APoint[]
    ) {

    }

    execute(): void {
        const { editor } = this
        const apartment = new Apartment(this.points, editor.eventService)
        editor.addApartment(apartment)
        this.apartmentId = apartment.id
    }

    undo(): void {
        if (this.apartmentId) {
            this.editor.deleteApartment(this.apartmentId)
            this.apartmentId = null
        }
    }
}