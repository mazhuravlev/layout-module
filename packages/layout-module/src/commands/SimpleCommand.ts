import { EditorCommand } from './EditorCommand'

export class SimpleCommand implements EditorCommand {

    public get description() { return 'Действие' }

    constructor(
        private _up: () => void,
        private _down: () => void,
    ) { }

    execute(): void {
        this._up()
    }

    undo(): void {
        this._down()
    }

    dispose(): void {
    }

}