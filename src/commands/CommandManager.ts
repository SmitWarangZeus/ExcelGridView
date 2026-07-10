import type { ICommand } from "./ICommand.js";

export class CommandManager {
    private readonly undoStack: ICommand[] = [];
    private readonly redoStack: ICommand[] = [];

    public executeCommand(command: ICommand): void {
        command.execute();
        this.undoStack.push(command);
        this.redoStack.length = 0;
    }

    public undo(): boolean {
        const command = this.undoStack.pop();
        if (!command) {
            return false;
        }
        command.undo();
        this.redoStack.push(command);
        return true;
    }

    public redo(): boolean {
        const command = this.redoStack.pop();
        if (!command) {
            return false;
        }
        command.execute();
        this.undoStack.push(command);
        return true;
    }

    // public canUndo(): boolean {
    //     return this.undoStack.length > 0;
    // }

    // public canRedo(): boolean {
    //     return this.redoStack.length > 0;
    // }

    // public clear(): void {
    //     this.undoStack.length = 0;
    //     this.redoStack.length = 0;
    // }
}
