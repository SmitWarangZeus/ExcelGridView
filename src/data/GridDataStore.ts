import type { CellRange } from "../GridTypes.js";

export class GridDataStore {
    private readonly values = new Map<number, string>();

    constructor(private readonly colCount: number) {}

    private toKey(row: number, col: number): number {
        return row * this.colCount + col;
    }

    public getValue(row: number, col: number): string {
        return this.values.get(this.toKey(row, col)) ?? "";
    }

    public setValue(row: number, col: number, value: string): void {
        const key = this.toKey(row, col);
        if (value === "") {
            this.values.delete(key);
        } else {
            this.values.set(key, value);
        }
    }

    // public hasValue(row: number, col: number): boolean {
    //     return this.values.has(this.toKey(row, col));
    // }

    // public get populatedCellCount(): number {
    //     return this.values.size;
    // }

    public *iterateNonEmptyInRange(range: CellRange): IterableIterator<{ row: number; col: number; value: string }> {
        for (const [key, value] of this.values) {
            const row = Math.floor(key / this.colCount);
            const col = key % this.colCount;
            if (row >= range.startRow && row <= range.endRow && col >= range.startCol && col <= range.endCol) {
                yield { row, col, value };
            }
        }
    }
}
