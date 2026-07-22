import { GridConfig } from "../GridConfig.js";
import type { ActiveHandler, PixelRect, ResizeState, SummaryResult } from "../GridTypes.js";
import { RowColumnSizeStore } from "../data/RowColumnSizeStore.js";
import { GridDataStore } from "../data/GridDataStore.js";
import { ViewportManager } from "../ViewportManager.js";
import { SelectionManager } from "../SelectionManager.js";
import { CommandManager } from "../commands/CommandManager.js";
import { ResizeColumnCommand } from "../commands/ResizeColumnCommand.js";
import { ResizeRowCommand } from "../commands/ResizeRowCommand.js";
import { SummaryCalculator } from "../SummaryCalculator.js";
import { EditManager } from "../EditManager.js";
import { GridRenderer } from "../GridRenderer.js";
import { ColHeaderSelection } from "../Selection/ColHeaderSelection.js";
import { GridSelection } from "../Selection/GridSelection.js";
import { RowHeaderSelection } from "../Selection/RowHeaderSelection.js";
import { SubGridSelection } from "../Selection/SubGridSelection.js";
import { ColResize } from "../Resize/ColResize.js";
import { RowResize } from "../Resize/RowResize.js";

export class Grid {
    private readonly ctx: CanvasRenderingContext2D;
    private readonly sizeStore: RowColumnSizeStore;
    private readonly dataStore: GridDataStore;
    private readonly viewport: ViewportManager;
    private readonly selectionManager: SelectionManager;
    private readonly commandManager: CommandManager;
    private readonly summaryCalculator: SummaryCalculator;
    private readonly editManager: EditManager;
    private readonly renderer: GridRenderer;

    private isPanning = false;
    private lastMouseX = 0;
    private lastMouseY = 0;
    private resizeState: ResizeState | null = null;

    private readonly handlers: ActiveHandler[];
    private activeHandler: ActiveHandler = null;
    private colHeaderSelection: ColHeaderSelection;
    private gridSelection: GridSelection;
    private rowHeaderSelection: RowHeaderSelection;
    private subGridSelection: SubGridSelection;
    private colResize: ColResize;
    private rowResize: RowResize;

    constructor(
        private readonly canvas: HTMLCanvasElement,
        private readonly rowCount: number,
        private readonly colCount: number,
        cellWidth: number,
        cellHeight: number,
        private readonly onSummaryChange?: (summary: SummaryResult) => void,
    ) {
        const context = canvas.getContext("2d");
        if (!context) {
            throw new Error("Canvas not supported in this browser.");
        }
        this.ctx = context;

        this.sizeStore = new RowColumnSizeStore(rowCount, colCount, cellHeight, cellWidth);
        this.dataStore = new GridDataStore(colCount);
        this.viewport = new ViewportManager(this.sizeStore);
        this.selectionManager = new SelectionManager(rowCount, colCount);
        this.commandManager = new CommandManager();
        this.summaryCalculator = new SummaryCalculator(this.dataStore);
        this.editManager = new EditManager(this.dataStore, this.commandManager, () => this.draw());
        this.renderer = new GridRenderer(this.sizeStore, this.dataStore, this.selectionManager, this.viewport);
        this.colHeaderSelection = new ColHeaderSelection(this.selectionManager, this.viewport, this.sizeStore, canvas);
        this.gridSelection = new GridSelection(this.selectionManager, this.viewport, this.sizeStore, canvas);
        this.rowHeaderSelection = new RowHeaderSelection(this.selectionManager, this.viewport, this.sizeStore, canvas);
        this.subGridSelection = new SubGridSelection(this.selectionManager, this.viewport, this.sizeStore, canvas);
        this.colResize = new ColResize(this.resizeState, this.viewport, this.sizeStore, canvas, this.commandManager);
        this.rowResize = new RowResize(this.resizeState, this.viewport, this.sizeStore, canvas, this.commandManager);
        this.handlers = [this.colResize, this.rowResize, this.colHeaderSelection, this.gridSelection, this.rowHeaderSelection, this.subGridSelection];

        this.attachEvents();
        this.resizeCanvasToWindow();
    }

    public getDataStore(): GridDataStore {
        return this.dataStore;
    }

    public draw(): void {
        this.renderer.draw(this.ctx, this.canvas.width, this.canvas.height);
    }

    public undo(): void {
        if (this.commandManager.undo()) {
            this.draw();
            this.updateSummary();
        }
    }

    public redo(): void {
        if (this.commandManager.redo()) {
            this.draw();
            this.updateSummary();
        }
    }

    private attachEvents(): void {
        window.addEventListener("resize", () => this.resizeCanvasToWindow());

        this.canvas.addEventListener("wheel", (e) => this.onWheel(e), { passive: false });
        this.canvas.addEventListener("mousedown", (e) => this.onMouseDown(e));
        this.canvas.addEventListener("mousemove", (e) => this.onMouseMove(e));
        this.canvas.addEventListener("mouseup", () => this.onMouseUp());
        this.canvas.addEventListener("mouseleave", () => this.onMouseUp());
        this.canvas.addEventListener("dblclick", (e) => this.onDoubleClick(e));

        window.addEventListener("keydown", (e) => this.onKeyDown(e));
    }

    private resizeCanvasToWindow(): void {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.viewport.setCanvasSize(this.canvas.width, this.canvas.height);
        this.draw();
    }

    private onWheel(e: WheelEvent): void {
        e.preventDefault();
        this.viewport.scrollBy(e.deltaX, e.deltaY);
        this.draw();
    }

    private onMouseDown(e: MouseEvent): void {
        // const { x, y } = this.getCanvasCoords(e);

        // const colToResize = this.findColumnResizeHandle(x, y);
        // if (colToResize !== null) {
        //     this.resizeState = {
        //         axis: "col",
        //         index: colToResize,
        //         startPos: e.clientX,
        //         oldSize: this.sizeStore.getColWidth(colToResize),
        //     };
        //     return;
        // }

        // const rowToResize = this.findRowResizeHandle(x, y);
        // if (rowToResize !== null) {
        //     this.resizeState = {
        //         axis: "row",
        //         index: rowToResize,
        //         startPos: e.clientY,
        //         oldSize: this.sizeStore.getRowHeight(rowToResize),
        //     };
        //     return;
        // }

        // const { row, col } = this.getCellAtCanvasCoords(x, y);

        // if (row === -1 && col === -1) {
        //     this.selectionManager.selectAll();
        // } else if (row === -1 && col >= 0) {
        //     this.selectionManager.beginColumnSelection(col);
        // } else if (col === -1 && row >= 0) {
        //     this.selectionManager.beginRowSelection(row);
        // } else if (row >= 0 && col >= 0) {
        //     this.selectionManager.beginCellSelection(row, col);
        // } else {
        //     this.isPanning = true;
        //     this.lastMouseX = e.clientX;
        //     this.lastMouseY = e.clientY;
        // }
        for (let handler of this.handlers) {
            if (handler?.hitTest(e)) {
                this.activeHandler = handler;
                this.activeHandler.onPointerDown(e);
                break;
            }
        }

        this.draw();
        this.updateSummary();
    }

    private onMouseMove(e: MouseEvent): void {
        if (this.isPanning) {
            this.viewport.scrollBy(this.lastMouseX - e.clientX, this.lastMouseY - e.clientY);
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            this.draw();
            return;
        }

        // if (this.resizeState) {
        //     if (this.resizeState.axis === "col") {
        //         const delta = e.clientX - this.resizeState.startPos;
        //         const newWidth = Math.max(GridConfig.MIN_COL_WIDTH, this.resizeState.oldSize + delta);
        //         this.sizeStore.setColWidth(this.resizeState.index, newWidth);
        //     } else {
        //         const delta = e.clientY - this.resizeState.startPos;
        //         const newHeight = Math.max(GridConfig.MIN_ROW_HEIGHT, this.resizeState.oldSize + delta);
        //         this.sizeStore.setRowHeight(this.resizeState.index, newHeight);
        //     }
        //     this.draw();
        //     return;
        // }

        // if (!this.selectionManager.getDragTarget()) {
        //     return;
        // }

        // const { x, y } = this.getCanvasCoords(e);
        // const { row, col } = this.getCellAtCanvasCoords(x, y);
        // this.selectionManager.updateDragTo(row, col);
        this.activeHandler?.onPointerMove(e);
        this.draw();
        this.updateSummary();
    }

    private onMouseUp(): void {
        // if (this.resizeState) {
        //     const { axis, index, oldSize } = this.resizeState;
        //     if (axis === "col") {
        //         const newSize = this.sizeStore.getColWidth(index);
        //         this.commandManager.executeCommand(
        //             // new ResizeColumnCommand(this.sizeStore, index, oldSize, newSize, () => this.draw()),
        //             new ResizeColumnCommand(this.sizeStore, index, oldSize, newSize),
        //         );
        //     } else {
        //         const newSize = this.sizeStore.getRowHeight(index);
        //         this.commandManager.executeCommand(
        //             new ResizeRowCommand(this.sizeStore, index, oldSize, newSize, () => this.draw()),
        //         );
        //     }
        // }
        this.isPanning = false;
        // this.resizeState = null;
        // this.selectionManager.endDrag();
        this.activeHandler?.onPointerUp();
    }

    private onDoubleClick(e: MouseEvent): void {
        const { x, y } = this.getCanvasCoords(e);
        const { row, col } = this.getCellAtCanvasCoords(x, y);
        if (row >= 0 && row < this.rowCount && col >= 0 && col < this.colCount) {
            this.beginCellEdit(row, col);
        }
    }

    private onKeyDown(e: KeyboardEvent): void {
        if (this.editManager.isEditing()) {
            return;
        }

        if (e.ctrlKey && e.key.toLowerCase() === "z") {
            e.preventDefault();
            this.undo();
            this.draw();
            return;
        }
        if (e.ctrlKey && e.key.toLowerCase() === "y") {
            e.preventDefault();
            this.redo();
            this.draw();
            return;
        }

        if (!this.selectionManager.hasActiveCell()) {
            return;
        }

        switch (e.key) {
            case "ArrowUp":
                this.selectionManager.moveActiveCell(-1, 0);
                break;
            case "ArrowDown":
                this.selectionManager.moveActiveCell(1, 0);
                break;
            case "ArrowLeft":
                this.selectionManager.moveActiveCell(0, -1);
                break;
            case "ArrowRight":
                this.selectionManager.moveActiveCell(0, 1);
                break;
            case "Enter": {
                const { row, col } = this.selectionManager.getActiveCell();
                this.beginCellEdit(row, col);
                return;
            }
            default:
                return;
        }
        e.preventDefault();
        this.draw();
        this.updateSummary();
    }

    private getCanvasCoords(e: MouseEvent): { x: number; y: number } {
        const rect = this.canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    private getCellAtCanvasCoords(canvasX: number, canvasY: number): { row: number; col: number } {
        const gridX = this.viewport.canvasXToGridX(canvasX);
        const gridY = this.viewport.canvasYToGridY(canvasY);
        const col = gridX < 0 ? -1 : this.sizeStore.getColIndexAtOffset(gridX);
        const row = gridY < 0 ? -1 : this.sizeStore.getRowIndexAtOffset(gridY);
        return { row, col };
    }

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

    private beginCellEdit(row: number, col: number): void {
        const rect = this.canvas.getBoundingClientRect();
        const colOffset = col > 0 ? this.sizeStore.getColOffset(col) : 0;
        const rowOffset = row > 0 ? this.sizeStore.getRowOffset(row) : 0;

        const screenRect: PixelRect = {
            x: rect.left + colOffset - this.viewport.getScrollX() + GridConfig.HEADER_WIDTH,
            y: rect.top + rowOffset - this.viewport.getScrollY() + GridConfig.HEADER_HEIGHT,
            width: this.sizeStore.getColWidth(col) - 2,
            height: this.sizeStore.getRowHeight(row) - 2,
        };

        this.editManager.beginEdit(row, col, screenRect);
    }

    private updateSummary(): void {
        if (!this.onSummaryChange) {
            return;
        }
        const selection = this.selectionManager.getSelection();
        if (!selection) {
            return;
        }
        this.onSummaryChange(this.summaryCalculator.calculate(selection));
    }
}
