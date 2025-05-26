import { EditorCommand } from '../commands/EditorCommand'

export class CommandManager {
    private _undoStack: EditorCommand[] = []
    private _redoStack: EditorCommand[] = []

    execute(command: EditorCommand) {
        this._undoStack.push(command)
        this._redoStack.forEach(x => x.dispose())
        this._redoStack = []
        command.execute()
    }

    undo(): boolean {
        if (this._undoStack.length === 0) return false

        const command = this._undoStack.pop()!
        command.undo()
        this._redoStack.push(command)
        return true
    }

    redo(): boolean {
        if (this._redoStack.length === 0) return false

        const command = this._redoStack.pop()!
        command.execute()
        this._undoStack.push(command)
        return true
    }

    dispose() {
        [...this._undoStack, ...this._redoStack].forEach(x => x.dispose())
        this._undoStack = []
        this._redoStack = []
    }
}