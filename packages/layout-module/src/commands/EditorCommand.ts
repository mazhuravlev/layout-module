import { IDisposable } from '../types'

export interface EditorCommand extends IDisposable {
    execute(): void;
    undo(): void;
    description: string
}