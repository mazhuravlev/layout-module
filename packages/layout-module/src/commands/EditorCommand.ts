export interface EditorCommand {
    execute(): void;
    undo(): void;
}