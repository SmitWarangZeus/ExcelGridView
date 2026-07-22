import type { CommandManager } from "../commands/CommandManager.js";
import { ResizeColumnCommand } from "../commands/ResizeColumnCommand.js";
import type { RowColumnSizeStore } from "../data/RowColumnSizeStore.js";
import { GridConfig } from "../GridConfig.js";
import type { ResizeState } from "../GridTypes.js";
import type { ViewportManager } from "../ViewportManager.js";

export class ColResize {
    constructor(
        private resizeState: ResizeState | null,
        private readonly viewport: ViewportManager,
        private readonly sizeStore: RowColumnSizeStore,
        private readonly canvas: HTMLCanvasElement,
        private readonly commandManager: CommandManager
    ) { }

    private findColumnResizeHandle(canvasX: number, canvasY: number): number | null {
        if (canvasY > GridConfig.HEADER_HEIGHT) {
            return null;
        }
        const gridX = this.viewport.canvasXToGridX(canvasX);
        if (gridX < 0) {
            return null;
        }
        const col = this.sizeStore.getColIndexAtOffset(gridX);
        if (col < 0) {
            return null;
        }
        const tolerance = GridConfig.RESIZE_HANDLE_TOLERANCE_PX;
        const rightEdgeScreenX = GridConfig.HEADER_WIDTH + this.sizeStore.getColOffset(col + 1) - this.viewport.getScrollX();
        if (Math.abs(canvasX - rightEdgeScreenX) < tolerance) {
            return col;
        }
        if (col > 0) {
            const leftEdgeScreenX = GridConfig.HEADER_WIDTH + this.sizeStore.getColOffset(col) - this.viewport.getScrollX();
            if (Math.abs(canvasX - leftEdgeScreenX) < tolerance) {
                return col - 1;
            }
        }
        return null;
    }

    private getCanvasCoords(e: MouseEvent): { x: number, y: number } {
        const rect = this.canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    public hitTest(e: MouseEvent): boolean {
        const { x, y } = this.getCanvasCoords(e);
        const colToResize = this.findColumnResizeHandle(x, y);
        return colToResize !== null;
    }

    public onPointerDown(e: MouseEvent): void {
        const { x, y } = this.getCanvasCoords(e);
        const colToResize = this.findColumnResizeHandle(x, y);
        if (colToResize !== null) {
            this.resizeState = {
                axis: "col",
                index: colToResize,
                startPos: e.clientX,
                oldSize: this.sizeStore.getColWidth(colToResize),
            };
        }
    }

    public onPointerMove(e: MouseEvent) {
        if (this.resizeState) {
            const delta = e.clientX - this.resizeState.startPos;
            const newWidth = Math.max(GridConfig.MIN_COL_WIDTH, this.resizeState.oldSize + delta);
            this.sizeStore.setColWidth(this.resizeState.index, newWidth);
        }
    }

    public onPointerUp() {
        if (this.resizeState) {
            const { axis, index, oldSize } = this.resizeState;
            const newSize = this.sizeStore.getColWidth(index);
            this.commandManager.executeCommand(
                new ResizeColumnCommand(this.sizeStore, index, oldSize, newSize),
            );
        }
        this.resizeState = null;
    }
}