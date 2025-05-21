import { Apartment } from '../entities/Apartment'
import { Editor } from '../Editor/Editor'
import { EditorCommand } from './EditorCommand'
import { ApartmentProperties } from '../entities/ApartmentProperties'
import { assertDefined } from '../func'

export class UpdateApartmentPropertiesCommand implements EditorCommand {
    private _savedProperties = new Map<string, ApartmentProperties>()

    constructor(
        private _editor: Editor,
        private _apartments: Apartment[],
        private _properties: Partial<ApartmentProperties>,
    ) {
    }

    execute(): void {
        this._apartments.forEach((apartment) => {
            this._savedProperties.set(apartment.id, { ...apartment.properties })
            apartment.properties = { ...apartment.properties, ...this._properties }
        })
        this._editor.onObjectSelected()
    }

    undo(): void {
        this._apartments.forEach((apartment) => {
            const savedProperties = assertDefined(this._savedProperties.get(apartment.id))
            apartment.properties = savedProperties
        })
        this._editor.onObjectSelected()
    }

    dispose(): void {
    }
}