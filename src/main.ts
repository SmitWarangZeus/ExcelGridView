import { Grid } from "./core/Grid.js";
import { JsonDataLoader } from "./data/JsonDataLoader.js";
import { GridConfig } from "./GridConfig.js";
import type { SummaryResult } from "./GridTypes.js";

function renderSummary(summary: SummaryResult): void {
    const countEl = document.getElementById("m-count");
    const minEl = document.getElementById("m-min");
    const maxEl = document.getElementById("m-max");
    const sumEl = document.getElementById("m-sum");
    const avgEl = document.getElementById("m-avg");

    if (countEl) countEl.innerText = summary.count.toString();
    if (minEl) minEl.innerText = summary.min !== null ? summary.min.toString() : "N/A";
    if (maxEl) maxEl.innerText = summary.max !== null ? summary.max.toString() : "N/A";
    if (sumEl) sumEl.innerText = summary.sum.toString();
    if (avgEl) avgEl.innerText = summary.average !== null ? summary.average.toFixed(2) : "N/A";
}

window.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("grid") as HTMLCanvasElement | null;
    if (!canvas) {
        throw new Error("Canvas element with id 'grid' was not found.");
    }

    const grid = new Grid(
        canvas,
        GridConfig.DEFAULT_ROW_COUNT,
        GridConfig.DEFAULT_COL_COUNT,
        GridConfig.DEFAULT_CELL_WIDTH,
        GridConfig.DEFAULT_CELL_HEIGHT,
        renderSummary,
    );

    grid.draw();

    JsonDataLoader.loadEmployeesFromUrlIntoStore(GridConfig.EMPLOYEE_DATA_URL, grid.getDataStore())
        .then((loadedCount) => {
            console.log(`Loaded ${loadedCount} employee record(s) from "${GridConfig.EMPLOYEE_DATA_URL}".`);
            grid.draw();
        })
        .catch((error: unknown) => {
            console.error(`Could not load employee data from "${GridConfig.EMPLOYEE_DATA_URL}":`, error);
        });
});
