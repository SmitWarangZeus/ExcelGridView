import SelectionManager from "./SelectionManager.js";

export class RowHeaderSelection extends SelectionManager {
    public beginRowSelection(row: number): void {
        this.dragTarget = "rowHeader";
        this.dragAnchor = { row, col: 0 };
        this.activeRow = row;
        this.activeCol = 0;
        this.selection = { startRow: row, startCol: 0, endRow: row, endCol: this.colCount - 1 };
    }

    public updateDragTo(row: number, col: number): void {
        if (!this.dragTarget) {
            return;
        }

        if (this.dragTarget === "rowHeader" && row >= 0) {
            const targetRow = Math.min(this.rowCount - 1, row);
            this.selection = {
                startRow: Math.min(this.dragAnchor.row, targetRow),
                startCol: 0,
                endRow: Math.max(this.dragAnchor.row, targetRow),
                endCol: this.colCount - 1,
            };
        }
    }

    public hitTest(x: number, y: number, row: number, col: number): boolean {
        return col === -1 && row >= 0;
    }

    public onPointerDown(row: number, col: number): void {
        this.beginRowSelection(row);
    }

    public onPointerMove(row: number, col: number): void {
        this.updateDragTo(row, col);
    }
}
