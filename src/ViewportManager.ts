import { RowColumnSizeStore } from "./data/RowColumnSizeStore.js";
import { GridConfig } from "./GridConfig.js";

export class ViewportManager {
    private scrollX = 0;
    private scrollY = 0;
    private canvasWidth = 0;
    private canvasHeight = 0;

    constructor(private readonly sizeStore: RowColumnSizeStore) {}

    public setCanvasSize(width: number, height: number): void {
        this.canvasWidth = width;
        this.canvasHeight = height;
        this.clampScroll();
    }

    public getScrollX(): number {
        return this.scrollX;
    }

    public getScrollY(): number {
        return this.scrollY;
    }

    public scrollBy(dx: number, dy: number): void {
        this.scrollX += dx;
        this.scrollY += dy;
        this.clampScroll();
    }

    private clampScroll(): void {
        const maxScrollX = Math.max(0, this.sizeStore.getTotalWidth() - this.canvasWidth);
        const maxScrollY = Math.max(0, this.sizeStore.getTotalHeight() - this.canvasHeight);
        this.scrollX = Math.max(0, Math.min(this.scrollX, maxScrollX));
        this.scrollY = Math.max(0, Math.min(this.scrollY, maxScrollY));
    }

    public getFirstVisibleRow(): number {
        return this.sizeStore.getRowIndexAtOffset(this.scrollY);
    }

    public getFirstVisibleCol(): number {
        return this.sizeStore.getColIndexAtOffset(this.scrollX);
    }

    public canvasXToGridX(canvasX: number): number {
        return canvasX + this.scrollX - GridConfig.HEADER_WIDTH;
    }

    public canvasYToGridY(canvasY: number): number {
        return canvasY + this.scrollY - GridConfig.HEADER_HEIGHT;
    }

    public getRenderStartX(firstVisibleCol: number): number {
        const colOffset = firstVisibleCol > 0 ? this.sizeStore.getColOffset(firstVisibleCol) : 0;
        return GridConfig.HEADER_WIDTH - (this.scrollX - colOffset);
    }

    public getRenderStartY(firstVisibleRow: number): number {
        const rowOffset = firstVisibleRow > 0 ? this.sizeStore.getRowOffset(firstVisibleRow) : 0;
        return GridConfig.HEADER_HEIGHT - (this.scrollY - rowOffset);
    }
}
