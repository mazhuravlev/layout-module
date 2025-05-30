import { Apartment } from '../entities/Apartment'
import { EditorCommand } from './EditorCommand'
import { ApartmentProperties } from '../entities/ApartmentProperties'
import { assertDefined } from '../func'

export class UpdateApartmentPropertiesCommand implements EditorCommand {
    private _savedProperties = new Map<string, ApartmentProperties>()

    public get description() { return 'Изменить свойство' }

    constructor(
        private _apartments: Apartment[],
        private _properties: Partial<ApartmentProperties>,
    ) {
    }

    execute(): void {
        this._apartments.forEach((apartment) => {
            this._savedProperties.set(apartment.id, { ...apartment.properties })
            apartment.setProperties(this._properties)
        })
    }

    undo(): void {
        this._apartments.forEach((apartment) => {
            const savedProperties = assertDefined(this._savedProperties.get(apartment.id))
            apartment.setProperties(savedProperties)
        })
    }

    dispose(): void {
    }
}