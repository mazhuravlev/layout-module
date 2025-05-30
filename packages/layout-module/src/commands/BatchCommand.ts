import { EditorCommand } from './EditorCommand'

export class BatchCommand implements EditorCommand {
    private commands: EditorCommand[]

    constructor(commands: EditorCommand[]) {
        this.commands = [...commands] // Create a copy to avoid mutation
    }

    execute(): void {
        for (const command of this.commands) {
            command.execute()
        }
    }

    undo(): void {
        // Undo in reverse order
        for (let i = this.commands.length - 1; i >= 0; i--) {
            this.commands[i].undo()
        }
    }

    get description(): string {
        if (this.commands.length === 0) {
            return 'Empty batch command'
        }
        if (this.commands.length === 1) {
            return this.commands[0].description
        }
        return `Batch command (${this.commands.length} operations)`
    }

    dispose(): void {
        // TODO: dispose?
    }
}