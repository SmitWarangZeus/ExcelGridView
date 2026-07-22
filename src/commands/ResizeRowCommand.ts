import type { ICommand } from "./ICommand.js";
import { RowColumnSizeStore } from "../data/RowColumnSizeStore.js";

export class ResizeRowCommand implements ICommand {
    constructor(
        private readonly sizeStore: RowColumnSizeStore,
        private readonly rowIndex: number,
        private readonly oldHeight: number,
        private readonly newHeight: number,
    ) {}

    public execute(): void {
        this.sizeStore.setRowHeight(this.rowIndex, this.newHeight);
    }

    public undo(): void {
        this.sizeStore.setRowHeight(this.rowIndex, this.oldHeight);
    }
}
