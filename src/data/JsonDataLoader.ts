import type { CellRecord } from "../GridTypes.js";
import { GridDataStore } from "./GridDataStore.js";

export class JsonDataLoader {
    public static generateRecords(
        rowLimit: number,
        colLimit: number,
        minRecordCount: number,
    ): CellRecord[] {
        const records: CellRecord[] = [];

        for (let r = 0; r < rowLimit && records.length < minRecordCount; r++) {
            for (let c = 0; c < colLimit; c++) {
                records.push({ row: r, col: c, value: this.randomValue() });
            }
        }

        return records;
    }

    public static loadIntoStore(records: CellRecord[], store: GridDataStore): void {
        for (const record of records) {
            if (!this.isValidRecord(record)) {
                continue;
            }
            store.setValue(record.row, record.col, record.value);
        }
    }

    private static isValidRecord(record: CellRecord): boolean {
        return (
            typeof record.row === "number" &&
            typeof record.col === "number" &&
            record.row >= 0 &&
            record.col >= 0 &&
            typeof record.value === "string"
        );
    }

    private static randomValue(): string {
        if (Math.random() > 0.3) {
            return Math.floor(Math.random() * 100).toString();
        }
        return Math.random() > 0.5 ? "Text" : "";
    }
}
