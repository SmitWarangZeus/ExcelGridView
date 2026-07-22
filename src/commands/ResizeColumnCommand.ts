import type { ICommand } from "./ICommand.js";
import { RowColumnSizeStore } from "../data/RowColumnSizeStore.js";

export class ResizeColumnCommand implements ICommand {
    constructor(
        private readonly sizeStore: RowColumnSizeStore,
        private readonly colIndex: number,
        private readonly oldWidth: number,
        private readonly newWidth: number,
        // private readonly onApplied?: () => void,
    ) {}

    public execute(): void {
        this.sizeStore.setColWidth(this.colIndex, this.newWidth);
        // this.onApplied?.();
    }

    public undo(): void {
        this.sizeStore.setColWidth(this.colIndex, this.oldWidth);
        // this.onApplied?.();
    }
}
