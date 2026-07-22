import type { CommandManager } from "../commands/CommandManager.js";
import { ResizeColumnCommand } from "../commands/ResizeColumnCommand.js";
import { ResizeRowCommand } from "../commands/ResizeRowCommand.js";
import type { RowColumnSizeStore } from "../data/RowColumnSizeStore.js";
import { GridConfig } from "../GridConfig.js";
import type { ResizeState } from "../GridTypes.js";
import type { ViewportManager } from "../ViewportManager.js";

export class RowResize {
    constructor(
        private resizeState: ResizeState | null,
        private readonly viewport: ViewportManager,
        private readonly sizeStore: RowColumnSizeStore,
        private readonly canvas: HTMLCanvasElement,
        private readonly commandManager: CommandManager
    ) { }

    private findRowResizeHandle(canvasX: number, canvasY: number): number | null {
        if (canvasX > GridConfig.HEADER_WIDTH) {
            return null;
        }
        const gridY = this.viewport.canvasYToGridY(canvasY);
        if (gridY < 0) {
            return null;
        }
        const row = this.sizeStore.getRowIndexAtOffset(gridY);
        if (row < 0) {
            return null;
        }
        const tolerance = GridConfig.RESIZE_HANDLE_TOLERANCE_PX;
        const bottomEdgeScreenY = GridConfig.HEADER_HEIGHT + this.sizeStore.getRowOffset(row + 1) - this.viewport.getScrollY();
        if (Math.abs(canvasY - bottomEdgeScreenY) < tolerance) {
            return row;
        }
        if (row > 0) {
            const topEdgeScreenY = GridConfig.HEADER_HEIGHT + this.sizeStore.getRowOffset(row) - this.viewport.getScrollY();
            if (Math.abs(canvasY - topEdgeScreenY) < tolerance) {
                return row - 1;
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
        const rowToResize = this.findRowResizeHandle(x, y);
        return rowToResize !== null;
    }

    public onPointerDown(e: MouseEvent): void {
        const { x, y } = this.getCanvasCoords(e);
        const rowToResize = this.findRowResizeHandle(x, y);
        if (rowToResize !== null) {
            this.resizeState = {
                index: rowToResize,
                startPos: e.clientY,
                oldSize: this.sizeStore.getRowHeight(rowToResize),
            };
        }
    }

    public onPointerMove(e: MouseEvent) {
        if (this.resizeState) {
            const delta = e.clientY - this.resizeState.startPos;
            const newHeight = Math.max(GridConfig.MIN_ROW_HEIGHT, this.resizeState.oldSize + delta);
            this.sizeStore.setRowHeight(this.resizeState.index, newHeight);
        }
    }

    public onPointerUp() {
        if (this.resizeState) {
            const { index, oldSize } = this.resizeState;
            const newSize = this.sizeStore.getRowHeight(index);
            this.commandManager.executeCommand(
                new ResizeRowCommand(this.sizeStore, index, oldSize, newSize),
            );
        }
        this.resizeState = null;
    }
}