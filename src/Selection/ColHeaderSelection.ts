import SelectionManager from "./SelectionManager.js";

export class ColHeaderSelection extends SelectionManager {
    public beginColumnSelection(col: number): void {
        this.dragTarget = "colHeader";
        this.dragAnchor = { row: 0, col };
        this.activeRow = 0;
        this.activeCol = col;
        this.selection = { startRow: 0, startCol: col, endRow: this.rowCount - 1, endCol: col };
    }

    public updateDragTo(row: number, col: number): void {
        if (!this.dragTarget) {
            return;
        }

        if (this.dragTarget === "colHeader" && col >= 0) {
            const targetCol = Math.min(this.colCount - 1, col);
            this.selection = {
                startRow: 0,
                startCol: Math.min(this.dragAnchor.col, targetCol),
                endRow: this.rowCount - 1,
                endCol: Math.max(this.dragAnchor.col, targetCol),
            };
        }
    }

    public hitTest(x: number, y: number, row: number, col: number): boolean {
        return row === -1 && col >= 0;
    }

    public onPointerDown(row: number, col: number): void {
        this.beginColumnSelection(col);
    }

    public onPointerMove(row: number, col: number): void {
        this.updateDragTo(row, col);
    }
}
