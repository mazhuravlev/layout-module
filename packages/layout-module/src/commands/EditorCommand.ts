import { IDisposable } from '../Editor/types'

export interface EditorCommand extends IDisposable {
    execute(): void;
    undo(): void;
}