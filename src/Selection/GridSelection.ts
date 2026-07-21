import SelectionManager from "./SelectionManager.js";

export class GridSelection extends SelectionManager {
    public selectAll(): void {
        this.selection = { startRow: 0, startCol: 0, endRow: this.rowCount - 1, endCol: this.colCount - 1 };
        this.activeRow = 0;
        this.activeCol = 0;
        this.dragTarget = null;
    }

    public updateDragTo(row: number, col: number): void {}

    public hitTest(x: number, y: number, row: number, col: number): boolean {
        return row === -1 && col === -1;
    }

    public onPointerDown(row: number, col: number): void {
        this.selectAll();
    }

    public onPointerMove(row: number, col: number): void {
        this.updateDragTo(row, col);
    }
}
