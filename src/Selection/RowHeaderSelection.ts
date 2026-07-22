import type { RowColumnSizeStore } from "../data/RowColumnSizeStore.js";
import type { SelectionManager } from "../SelectionManager.js";
import type { ViewportManager } from "../ViewportManager.js";

export class RowHeaderSelection {
    constructor(
        private readonly selectionManager: SelectionManager, 
        private readonly viewport: ViewportManager, 
        private readonly sizeStore: RowColumnSizeStore,
        private readonly canvas: HTMLCanvasElement
    ) {}

    private getCellFromCoords(x: number, y: number) {
        const gridX = this.viewport.canvasXToGridX(x);
        const gridY = this.viewport.canvasYToGridY(y);
        const col = gridX < 0 ? -1 : this.sizeStore.getColIndexAtOffset(gridX);
        const row = gridY < 0 ? -1 : this.sizeStore.getRowIndexAtOffset(gridY);
        return { row, col };
    }

    private getCanvasCoords(e: MouseEvent): { x: number, y: number } {
        const rect = this.canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    public hitTest(e: MouseEvent): boolean {
        const { x, y } = this.getCanvasCoords(e);
        const { row, col } = this.getCellFromCoords(x, y);
        return row >= 0 && col === -1;
    }

    public onPointerDown(e: MouseEvent): void {
        const { x, y } = this.getCanvasCoords(e);
        const { row, col } = this.getCellFromCoords(x, y);
        this.selectionManager.beginRowSelection(row);
    }

    public onPointerMove(e: MouseEvent) {
        if (!this.selectionManager.getDragTarget()) {
            return;
        }
        const { x, y } = this.getCanvasCoords(e);
        const { row, col } = this.getCellFromCoords(x, y);
        this.selectionManager.updateDragTo(row, col);
    }

    public onPointerUp() {
        this.selectionManager.endDrag();
    }
}