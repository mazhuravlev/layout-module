import { Apartment } from '../entities/Apartment'
import { APoint } from '../types'
import { EditorCommand } from './EditorCommand'

export class UpdateApartmentPointsCommand implements EditorCommand {

    constructor(
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