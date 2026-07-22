import { GridConfig } from "../GridConfig.js";
import type { ActiveHandler, PixelRect, ResizeState, SummaryResult } from "../GridTypes.js";
import { RowColumnSizeStore } from "../data/RowColumnSizeStore.js";
import { GridDataStore } from "../data/GridDataStore.js";
import { ViewportManager } from "../ViewportManager.js";
import { SelectionManager } from "../SelectionManager.js";
import { CommandManager } from "../commands/CommandManager.js";
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
        this.activeHandler?.onPointerMove(e);
        this.draw();
        this.updateSummary();
    }

    private onMouseUp(): void {
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
                this.activeHandler = this.subGridSelection;
                this.selectionManager.moveActiveCell(-1, 0);
                break;
            case "ArrowDown":
                this.activeHandler = this.subGridSelection;
                this.selectionManager.moveActiveCell(1, 0);
                break;
            case "ArrowLeft":
                this.activeHandler = this.subGridSelection;
                this.selectionManager.moveActiveCell(0, -1);
                break;
            case "ArrowRight":
                this.activeHandler = this.subGridSelection;
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
