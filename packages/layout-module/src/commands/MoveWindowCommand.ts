import { WindowObj } from '../entities/Window'
import { APoint } from '../types'
import { EditorCommand } from './EditorCommand'

export class MoveWindowCommand implements EditorCommand {

    public get description() { return 'Переместить окно' }

    constructor(
        private window: WindowObj,
        private moveData: {
            startPos: APoint
            endPos: APoint
        }
    ) { }

    execute(): void {
        this.window.updatePosition(this.moveData.endPos)
    }

    undo(): void {
        this.window.updatePosition(this.moveData.startPos)
    }

    dispose(): void {
    }
}