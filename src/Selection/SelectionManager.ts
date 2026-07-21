import type { CellRange, DragTargetType } from "../GridTypes.js";

export default class SelectionManager {
    protected selection: CellRange | null = null;
    protected activeRow = -1;
    protected activeCol = -1;
    protected dragAnchor = { row: -1, col: -1 };
    protected dragTarget: DragTargetType = null;

    constructor(protected readonly rowCount: number, protected readonly colCount: number) {}

    public getSelection(): CellRange | null {
        return this.selection;
    }

    public getActiveCell(): { row: number; col: number } {
        return { row: this.activeRow, col: this.activeCol };
    }

    public getDragTarget(): DragTargetType {
        return this.dragTarget;
    }

    public isCellSelected(row: number, col: number): boolean {
        const selected = this.selection;
        if (!selected) {
            return false;
        }
        return row >= selected.startRow && row <= selected.endRow && col >= selected.startCol && col <= selected.endCol;
    }

    public isRowHeaderSelected(row: number): boolean {
        const selected = this.selection;
        return selected !== null && row >= selected.startRow && row <= selected.endRow;
    }

    public isColHeaderSelected(col: number): boolean {
        const selected = this.selection;
        return selected !== null && col >= selected.startCol && col <= selected.endCol;
    }

    public endDrag(): void {
        this.dragTarget = null;
    }

    public moveActiveCell(deltaRow: number, deltaCol: number): void {
        if (this.activeRow < 0 || this.activeCol < 0) {
            return;
        }
        const nextRow = this.clamp(this.activeRow + deltaRow, 0, this.rowCount - 1);
        const nextCol = this.clamp(this.activeCol + deltaCol, 0, this.colCount - 1);
        this.activeRow = nextRow;
        this.activeCol = nextCol;
        this.dragTarget = "cells";
        this.selection = { startRow: nextRow, startCol: nextCol, endRow: nextRow, endCol: nextCol };
    }

    public hasActiveCell(): boolean {
        return this.activeRow >= 0 && this.activeCol >= 0;
    }

    public onPointerUp(): void {
        this.endDrag();
    }

    protected clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }
}
