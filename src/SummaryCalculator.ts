import type { CellRange, SummaryResult } from "./GridTypes.js";
import { GridDataStore } from "./data/GridDataStore.js";

export class SummaryCalculator {
    constructor(private readonly dataStore: GridDataStore) {}

    public calculate(range: CellRange): SummaryResult {
        let count = 0;
        let sum = 0;
        let min: number | null = null;
        let max: number | null = null;

        for (const { value } of this.dataStore.iterateNonEmptyInRange(range)) {
            const trimmed = value.trim();
            if (trimmed === "") {
                continue;
            }
            const num = Number(trimmed);
            if (Number.isNaN(num)) {
                continue;
            }
            count++;
            sum += num;
            min = min === null ? num : Math.min(min, num);
            max = max === null ? num : Math.max(max, num);
        }

        const average = count > 0 ? sum / count : null;

        return { count, sum, min, max, average };
    }
}
