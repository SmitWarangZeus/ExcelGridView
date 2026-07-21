import { RowColumnSizeStore } from "./data/RowColumnSizeStore.js";
import { GridDataStore } from "./data/GridDataStore.js";
import { ViewportManager } from "./ViewportManager.js";
import { GridConfig } from "./GridConfig.js";
import type { RowHeaderSelection } from "./Selection/RowHeaderSelection.js";
import type { ColHeaderSelection } from "./Selection/ColHeaderSelection.js";
import type { SubGridSelection } from "./Selection/SubGridSelection.js";
import type { GridSelection } from "./Selection/GridSelection.js";

export class GridRenderer {
    constructor(
        private readonly sizeStore: RowColumnSizeStore,
        private readonly dataStore: GridDataStore,
        private readonly viewport: ViewportManager,
    ) {}

    public draw(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, activeHandler: RowHeaderSelection | ColHeaderSelection | SubGridSelection | GridSelection | null = null): void {
        const { COLORS, HEADER_HEIGHT, HEADER_WIDTH, CELL_FONT } = GridConfig;

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx.font = CELL_FONT;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";

        const firstRow = this.viewport.getFirstVisibleRow();
        const firstCol = this.viewport.getFirstVisibleCol();
        const startX = this.viewport.getRenderStartX(firstCol);
        const startY = this.viewport.getRenderStartY(firstRow);

        const activeCell = activeHandler ? activeHandler.getActiveCell() : { row: -1, col: -1 };
        let activeCellRect = { x: 0, y: 0, w: 0, h: 0 };

        let currentY = startY;
        for (let r = firstRow; r < this.sizeStore.getRowCount(); r++) {
            if (currentY > canvasHeight) break;
            const rowHeight = this.sizeStore.getRowHeight(r);

            let currentX = startX;
            for (let c = firstCol; c < this.sizeStore.getColCount(); c++) {
                if (currentX > canvasWidth) break;
                const colWidth = this.sizeStore.getColWidth(c);

                ctx.strokeStyle = COLORS.gridLine;
                ctx.strokeRect(currentX, currentY, colWidth, rowHeight);

                if (activeHandler ? activeHandler.isCellSelected(r, c) : false) {
                    ctx.fillStyle = COLORS.selectionFill;
                    ctx.fillRect(currentX, currentY, colWidth, rowHeight);
                }

                if (activeCell.row === r && activeCell.col === c) {
                    activeCellRect = { x: currentX, y: currentY, w: colWidth, h: rowHeight };
                }

                ctx.fillStyle = COLORS.cellText;
                ctx.fillText(this.dataStore.getValue(r, c), currentX + 5, currentY + 18);

                currentX += colWidth;
            }
            currentY += rowHeight;
        }

        if (activeHandler ? activeHandler.hasActiveCell() : false) {
            ctx.strokeStyle = COLORS.activeCellBorder;
            ctx.strokeRect(activeCellRect.x, activeCellRect.y, activeCellRect.w, activeCellRect.h);
        }

        ctx.fillStyle = COLORS.headerBackground;
        ctx.fillRect(HEADER_WIDTH, 0, canvasWidth, HEADER_HEIGHT);
        ctx.fillRect(0, HEADER_HEIGHT, HEADER_WIDTH, canvasHeight);
        ctx.textAlign = "center";

        let headerX = startX;
        for (let c = firstCol; c < this.sizeStore.getColCount(); c++) {
            if (headerX > canvasWidth) break;
            const colWidth = this.sizeStore.getColWidth(c);
            const isSelected = activeHandler ? activeHandler.isColHeaderSelected(c) : false;
            ctx.fillStyle = isSelected ? COLORS.headerBackgroundSelected : COLORS.headerBackground;
            ctx.fillRect(headerX, 0, colWidth, HEADER_HEIGHT);
            ctx.strokeStyle = COLORS.headerBorder;
            ctx.strokeRect(headerX, 0, colWidth, HEADER_HEIGHT);
            ctx.fillStyle = COLORS.headerText;
            ctx.fillText(this.columnLabel(c), headerX + colWidth / 2, 18);
            headerX += colWidth;
        }

        let headerY = startY;
        for (let r = firstRow; r < this.sizeStore.getRowCount(); r++) {
            if (headerY > canvasHeight) break;
            const rowHeight = this.sizeStore.getRowHeight(r);
            const isSelected = activeHandler ? activeHandler.isRowHeaderSelected(r) : false;
            ctx.fillStyle = isSelected ? COLORS.headerBackgroundSelected : COLORS.headerBackground;
            ctx.fillRect(0, headerY, HEADER_WIDTH, rowHeight);
            ctx.strokeStyle = COLORS.headerBorder;
            ctx.strokeRect(0, headerY, HEADER_WIDTH, rowHeight);
            ctx.fillStyle = COLORS.headerText;
            ctx.fillText((r + 1).toString(), HEADER_WIDTH / 2, headerY + 18);
            headerY += rowHeight;
        }

        ctx.fillStyle = COLORS.cornerBackground;
        ctx.fillRect(0, 0, HEADER_WIDTH, HEADER_HEIGHT);
    }

    private columnLabel(index: number): string {
        let label = "";
        let i = index;
        while (i >= 0) {
            label = String.fromCharCode((i % 26) + 65) + label;
            i = Math.floor(i / 26) - 1;
        }
        return label;
    }
}
