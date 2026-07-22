import type { CellRange, DragTargetType } from "./GridTypes.js";

export class SelectionManager {
    private selection: CellRange | null = null;
    private activeRow = -1;
    private activeCol = -1;
    private dragAnchor = { row: -1, col: -1 };
    private dragTarget: DragTargetType = null;

    constructor(private readonly rowCount: number, private readonly colCount: number) {}

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

    public selectAll(): void {
        this.selection = { startRow: 0, startCol: 0, endRow: this.rowCount - 1, endCol: this.colCount - 1 };
        this.activeRow = 0;
        this.activeCol = 0;
        this.dragTarget = null;
    }

    public beginCellSelection(row: number, col: number): void {
        this.dragTarget = "cells";
        this.dragAnchor = { row, col };
        this.activeRow = row;
        this.activeCol = col;
        this.selection = { startRow: row, startCol: col, endRow: row, endCol: col };
    }

    public beginColumnSelection(col: number): void {
        this.dragTarget = "colHeader";
        this.dragAnchor = { row: 0, col };
        this.activeRow = 0;
        this.activeCol = col;
        this.selection = { startRow: 0, startCol: col, endRow: this.rowCount - 1, endCol: col };
    }

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

        if (this.dragTarget === "cells") {
            const targetRow = this.clamp(row, 0, this.rowCount - 1);
            const targetCol = this.clamp(col, 0, this.colCount - 1);
            this.selection = {
                startRow: Math.min(this.dragAnchor.row, targetRow),
                startCol: Math.min(this.dragAnchor.col, targetCol),
                endRow: Math.max(this.dragAnchor.row, targetRow),
                endCol: Math.max(this.dragAnchor.col, targetCol),
            };
        } else if (this.dragTarget === "colHeader" && col >= 0) {
            const targetCol = Math.min(this.colCount - 1, col);
            this.selection = {
                startRow: 0,
                startCol: Math.min(this.dragAnchor.col, targetCol),
                endRow: this.rowCount - 1,
                endCol: Math.max(this.dragAnchor.col, targetCol),
            };
        } else if (this.dragTarget === "rowHeader" && row >= 0) {
            const targetRow = Math.min(this.rowCount - 1, row);
            this.selection = {
                startRow: Math.min(this.dragAnchor.row, targetRow),
                startCol: 0,
                endRow: Math.max(this.dragAnchor.row, targetRow),
                endCol: this.colCount - 1,
            };
        }
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
        this.dragTarget = null;
        this.dragAnchor = { row: this.activeRow, col: this.activeCol };
        this.selection = { startRow: nextRow, startCol: nextCol, endRow: nextRow, endCol: nextCol };
    }

    public hasActiveCell(): boolean {
        return this.activeRow >= 0 && this.activeCol >= 0;
    }

    private clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }
}
