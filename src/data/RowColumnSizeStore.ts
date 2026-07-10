import { FenwickTree } from "./FenwickTree.js";

export class RowColumnSizeStore {
    private rowHeights: FenwickTree;
    private colWidths: FenwickTree;

    constructor(
        private readonly rowCount: number,
        private readonly colCount: number,
        defaultRowHeight: number,
        defaultColWidth: number,
    ) {
        this.rowHeights = new FenwickTree(new Array(rowCount).fill(defaultRowHeight));
        this.colWidths = new FenwickTree(new Array(colCount).fill(defaultColWidth));
    }

    public getRowCount(): number {
        return this.rowCount;
    }

    public getColCount(): number {
        return this.colCount;
    }

    public getRowHeight(row: number): number {
        return this.rowHeights.getSize(row);
    }

    public getColWidth(col: number): number {
        return this.colWidths.getSize(col);
    }

    public setRowHeight(row: number, height: number): void {
        this.rowHeights.setSize(row, height);
    }

    public setColWidth(col: number, width: number): void {
        this.colWidths.setSize(col, width);
    }

    public getRowOffset(row: number): number {
        return this.rowHeights.prefixSum(row - 1);
    }

    public getColOffset(col: number): number {
        return this.colWidths.prefixSum(col - 1);
    }

    public getTotalHeight(): number {
        return this.rowHeights.total();
    }

    public getTotalWidth(): number {
        return this.colWidths.total();
    }

    public getRowIndexAtOffset(y: number): number {
        return this.rowHeights.findIndexForOffset(y);
    }

    public getColIndexAtOffset(x: number): number {
        return this.colWidths.findIndexForOffset(x);
    }
}
