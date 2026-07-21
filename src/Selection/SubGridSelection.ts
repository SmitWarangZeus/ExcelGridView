import SelectionManager from "./SelectionManager.js";

export class SubGridSelection extends SelectionManager {
    public beginCellSelection(row: number, col: number): void {
        this.dragTarget = "cells";
        this.dragAnchor = { row, col };
        this.activeRow = row;
        this.activeCol = col;
        this.selection = { startRow: row, startCol: col, endRow: row, endCol: col };
    }

    public updateDragTo(row: number, col: number): void {
        if (!this.dragTarget) {
            return;
        }

        if (this.dragTarget === "cells") {
            const targetRow = this.clamp(row, 0, this.rowCount - 1);
            const targetCol = this.clamp(col, 0, this.colCount - 1);
            this.selection = {
                startRow: Math.min(this.dragAnchor.row, targetRow),
                startCol: Math.min(this.dragAnchor.col, targetCol),
                endRow: Math.max(this.dragAnchor.row, targetRow),
                endCol: Math.max(this.dragAnchor.col, targetCol),
            };
        }
    }

    public hitTest(x: number, y: number, row: number, col: number): boolean {
        return row >= 0 && col >= 0;
    }

    public onPointerDown(row: number, col: number): void {
        this.beginCellSelection(row, col);
    }

    public onPointerMove(row: number, col: number): void {
        this.updateDragTo(row, col);
    }
}
