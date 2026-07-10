let canvas: HTMLCanvasElement;
let grid: CanvasGrid;
let undoStk: (EditAction | Resize)[] = [];
let redoStk: (EditAction | Resize)[] = [];

interface Cell {
    row: number;
    col: number;
    value?: string;
}

interface EditAction {
    row: number;
    col: number;
    oldVal: string;
    newVal: string;
}

interface Resize {
    type: "row" | "col";
    index: number;
    startX: number;
    startY: number;
    oldSize: number;
    newSize: number;
}

interface CellRange {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
}

class CanvasGrid {
    private ctx: CanvasRenderingContext2D;
    private rows: number;
    private cols: number;
    private cellWidth: number;
    private cellHeight: number;
    public cells: Cell[][] = [];
    private inputEl: HTMLInputElement;
    private scrollX = 0;
    private scrollY = 0;
    private isDragging = false;
    private lastMouseX = 0;
    private lastMouseY = 0;

    public rowHeights: number[];
    public colWidths: number[];
    private rowPrefixSums: number[];
    private colPrefixSums: number[];

    private headerHeight = 25;
    private headerWidth = 50;

    private resizing: Resize | null = null;

    private selection: CellRange | null = null;
    private dragStartCell = { row: -1, col: -1 };
    private dragTarget: 'cells' | 'rowHeader' | 'colHeader' | null = null;

    constructor(
        private canvas: HTMLCanvasElement,
        rows: number,
        cols: number,
        cellWidth: number,
        cellHeight: number,
    ) {
        const context = canvas.getContext("2d");
        if (!context) {
            throw new Error("Canvas not supported in this browser.");
        }
        this.ctx = context;
        this.rows = rows;
        this.cols = cols;
        this.cellWidth = cellWidth;
        this.cellHeight = cellHeight;

        this.rowHeights = new Array(this.rows).fill(this.cellHeight);
        this.colWidths = new Array(this.cols).fill(this.cellWidth);

        this.rowPrefixSums = new Array(this.rows);
        this.colPrefixSums = new Array(this.cols);

        this.updatePrefixSums();

        this.inputEl = this.createInputElement();
        this.generateCells();
        this.attachEvents();
        this.resizeCanvas();
    }

    public updatePrefixSums() {
        let rowSum = 0;
        for (let i = 0; i < this.rows; i++) {
            rowSum += this.rowHeights[i] as number;
            this.rowPrefixSums[i] = rowSum;
        }

        let colSum = 0;
        for (let i = 0; i < this.cols; i++) {
            colSum += this.colWidths[i] as number;
            this.colPrefixSums[i] = colSum;
        }
    }

    private getIndexForOffset(offset: number, prefixSums: number[]): number {
        if (offset < 0) {
            return -1;
        }
        let low = 0;
        let high = prefixSums.length - 1;
        let index = -1;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            if (prefixSums[mid] as number <= offset) {
                low = mid + 1;
            } else {
                index = mid;
                high = mid - 1;
            }
        }
        return index === -1 ? prefixSums.length - 1 : index;
    }

    private resizeCanvas(): void {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.draw();
    }

    private onWheel(e: WheelEvent): void {
        e.preventDefault();
        this.scrollY = Math.max(0, this.scrollY + e.deltaY);
        this.scrollX = Math.max(0, this.scrollX + e.deltaX);

        this.clampScroll();
        this.draw();
    }

    private onMouseDown(e: MouseEvent): void {
        this.isDragging = true;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (y >= 0) { //&& y <= this.headerHeight
            let currentX = -this.scrollX + this.headerWidth;
            for (let c = 0; c < this.cols; c++) {
                currentX += this.colWidths[c] as number;
                if (Math.abs(x - currentX) < 5) {
                    this.resizing = { type: 'col', index: c, startX: e.clientX, startY: 0, oldSize: this.colWidths[c] as number, newSize: 0 };
                    this.isDragging = false;
                    return;
                }
            }
        }
        if (x >= 0) { //&& x <= this.headerWidth
            let currentY = -this.scrollY + this.headerHeight;
            for (let r = 0; r < this.rows; r++) {
                currentY += this.rowHeights[r] as number;
                if (Math.abs(y - currentY) < 5) {
                    this.resizing = { type: 'row', index: r, startX: 0, startY: e.clientY, oldSize: this.rowHeights[r] as number, newSize: 0 };
                    this.isDragging = false;
                    return;
                }
            }
        }

        const { row, col } = this.getCellFromCoords(x + this.scrollX - this.headerWidth, y + this.scrollY - this.headerHeight);
        if (row === -1 && col === -1) {
            this.selection = { startRow: 0, startCol: 0, endRow: this.rows - 1, endCol: this.cols - 1 };
            this.dragStartCell = { row: 0, col: 0 }
            this.dragTarget = null;
            this.isDragging = false;
        } else if (row === -1 && col >= 0) {
            this.dragTarget = 'colHeader';
            this.dragStartCell = { row: 0, col };
            this.selection = { startRow: 0, startCol: col, endRow: this.rows - 1, endCol: col };
        } else if (col === -1 && row >= 0) {
            this.dragTarget = 'rowHeader';
            this.dragStartCell = { row, col: 0 };
            this.selection = { startRow: row, startCol: 0, endRow: row, endCol: this.cols - 1 };
        } else if (row >= 0 && col >= 0) {
            this.dragTarget = 'cells';
            this.dragStartCell = { row, col };
            this.selection = { startRow: row, startCol: col, endRow: row, endCol: col };
        }
        this.draw();

        this.calculateMetrics();
    }

    private onMouseMove(e: MouseEvent): void {
        if (this.isDragging && !this.selection) {
            this.scrollX -= e.clientX - this.lastMouseX;
            this.scrollY -= e.clientY - this.lastMouseY;
            this.clampScroll();
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            this.draw();
        }

        if (this.resizing) {
            if (this.resizing.type === 'col') {
                const delta = e.clientX - this.resizing.startX;
                this.colWidths[this.resizing.index] = Math.max(20, this.resizing.oldSize + delta);
            } else {
                const delta = e.clientY - this.resizing.startY;
                this.rowHeights[this.resizing.index] = Math.max(15, this.resizing.oldSize + delta);
            }
            this.updatePrefixSums();
            this.draw();
        }

        if (!this.isDragging || !this.selection || !this.dragTarget) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left + this.scrollX - this.headerWidth;
        const y = e.clientY - rect.top + this.scrollY - this.headerHeight;
        const current = this.getCellFromCoords(x, y);

        if (this.dragTarget === 'cells') {
            const targetRow = Math.max(0, Math.min(this.rows - 1, current.row));
            const targetCol = Math.max(0, Math.min(this.cols - 1, current.col));
            this.selection = {
                startRow: Math.min(this.dragStartCell.row, targetRow),
                startCol: Math.min(this.dragStartCell.col, targetCol),
                endRow: Math.max(this.dragStartCell.row, targetRow),
                endCol: Math.max(this.dragStartCell.col, targetCol)
            };
        } else if (this.dragTarget === 'colHeader' && current.col >= 0) {
            const targetCol = Math.min(this.cols - 1, current.col);
            this.selection = {
                startRow: 0,
                startCol: Math.min(this.dragStartCell.col, targetCol),
                endRow: this.rows - 1,
                endCol: Math.max(this.dragStartCell.col, targetCol)
            };
        } else if (this.dragTarget === 'rowHeader' && current.row >= 0) {
            const targetRow = Math.min(this.rows - 1, current.row);
            this.selection = {
                startRow: Math.min(this.dragStartCell.row, targetRow),
                startCol: 0,
                endRow: Math.max(this.dragStartCell.row, targetRow),
                endCol: this.cols - 1
            };
        }
        this.draw();

        this.calculateMetrics();
    }

    private onMouseUp(): void {
        if (this.resizing) {
            if (this.resizing.type === 'col') {
                this.resizing.newSize = this.colWidths[this.resizing.index]!;
            } else {
                this.resizing.newSize = this.rowHeights[this.resizing.index]!;
            }
            undoStk.push(this.resizing);
        }
        this.isDragging = false;
        this.resizing = null;
        this.dragTarget = null;
    }

    private clampScroll(): void {
        const cellWidth = this.cellWidth;
        const cellHeight = this.cellHeight;
        const totalCols = this.cols;
        const totalRows = this.rows;

        this.scrollX = Math.max(0, Math.min(this.scrollX, totalCols * cellWidth - this.canvas.width));
        this.scrollY = Math.max(0, Math.min(this.scrollY, totalRows * cellHeight - this.canvas.height));
    }

    private createInputElement(): HTMLInputElement {
        const input = document.createElement("input");
        input.type = "text";
        input.style.position = "fixed";
        input.style.display = "none";
        input.style.border = "1px solid #000";
        input.style.font = "12px Arial";
        document.body.appendChild(input);
        return input;
    }

    private generateCells(): void {
        for (let r = 0; r < this.rows; r++) {
            const rowCells: Cell[] = [];
            for (let c = 0; c < this.cols; c++) {
                let value: string;
                if (Math.random() > 0.3) {
                    value = Math.floor(Math.random() * 100).toString();
                } else {
                    value = Math.random() > 0.5 ? "Text" : "";
                }
                rowCells.push({
                    row: r,
                    col: c,
                    value: (r < 50_000 && c < 5) ? value : ""
                });
            }
            this.cells.push(rowCells);
        }
    }

    public draw(): void {
        const ctx = this.ctx;

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.font = "12px Arial";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";

        const startRowIndex = this.getIndexForOffset(this.scrollY, this.rowPrefixSums);
        const startColIndex = this.getIndexForOffset(this.scrollX, this.colPrefixSums);

        let startX = this.headerWidth - (this.scrollX - (startColIndex > 0 ? this.colPrefixSums[startColIndex - 1] as number : 0));
        let startY = this.headerHeight - (this.scrollY - (startRowIndex > 0 ? this.rowPrefixSums[startRowIndex - 1] as number : 0));

        let selectedCell = { x: 0, y: 0, w: 0, h: 0 };

        let currentY = startY;
        for (let r = startRowIndex; r < this.rows; r++) {
            if (currentY > this.canvas.height) break;
            const rowHeight = this.rowHeights[r] as number;

            let currentX = startX;
            for (let c = startColIndex; c < this.cols; c++) {
                if (currentX > this.canvas.width) break;
                const colWidth = this.colWidths[c] as number;

                this.ctx.strokeStyle = '#cccccc';
                this.ctx.strokeRect(currentX, currentY, colWidth, rowHeight);

                if (this.isCellSelected(r, c)) {
                    this.ctx.fillStyle = 'rgba(33, 115, 70, 0.1)';
                    this.ctx.fillRect(currentX, currentY, this.colWidths[c] as number, this.rowHeights[r] as number);
                }

                if (Math.min(this.dragStartCell.col, this.dragStartCell.row) >= 0 && this.dragStartCell.col === c && this.dragStartCell.row === r) {
                    selectedCell = { x: currentX, y: currentY, w: colWidth, h: rowHeight };
                }

                this.ctx.fillStyle = '#000000';
                this.ctx.fillText(this.cells[r]![c]!.value || "", currentX + 5, currentY + 18);

                currentX += colWidth;
            }
            currentY += rowHeight;
        }

        this.ctx.strokeStyle = "#217346";
        this.ctx.strokeRect(selectedCell.x, selectedCell.y, selectedCell.w, selectedCell.h);

        this.ctx.fillStyle = '#f1f3f5';
        this.ctx.fillRect(this.headerWidth, 0, this.canvas.width, this.headerHeight);
        this.ctx.fillRect(0, this.headerHeight, this.headerWidth, this.canvas.height);
        this.ctx.textAlign = "center";

        let headerX = startX;
        for (let c = startColIndex; c < this.cols; c++) {
            if (headerX > this.canvas.width) break;
            const isColSelected = this.selection && c >= this.selection.startCol && c <= this.selection.endCol;
            this.ctx.fillStyle = isColSelected ? '#e1dfdd' : '#f3f2f1';
            this.ctx.fillRect(headerX, 0, this.colWidths[c] as number, this.headerHeight);
            this.ctx.strokeStyle = '#c8c6c4';
            this.ctx.strokeRect(headerX, 0, this.colWidths[c] as number, this.headerHeight);
            this.ctx.fillStyle = '#333333';
            this.ctx.fillText(this.renameHeader(c), headerX + (this.colWidths[c] as number) / 2, 18);
            headerX += this.colWidths[c] as number;
        }

        let headerY = startY;
        for (let r = startRowIndex; r < this.rows; r++) {
            if (headerY > this.canvas.height) break;
            const isRowSelected = this.selection && r >= this.selection.startRow && r <= this.selection.endRow;
            this.ctx.fillStyle = isRowSelected ? '#e1dfdd' : '#f3f2f1';
            this.ctx.fillRect(0, headerY, this.headerWidth, this.rowHeights[r] as number);
            this.ctx.strokeStyle = '#c8c6c4';
            this.ctx.strokeRect(0, headerY, this.headerWidth, this.rowHeights[r] as number);
            this.ctx.fillStyle = '#333333';
            this.ctx.fillText((r + 1).toString(), this.headerWidth / 2, headerY + 18);
            headerY += this.rowHeights[r] as number;
        }

        this.ctx.fillStyle = '#f1f3f5';
        this.ctx.fillRect(0, 0, this.headerWidth, this.headerHeight);
    }

    private getCellFromCoords(x: number, y: number) {
        const col = this.getIndexForOffset(x, this.colPrefixSums);
        const row = this.getIndexForOffset(y, this.rowPrefixSums);
        return { row, col };
    }

    private attachEvents(): void {
        this.canvas.addEventListener("dblclick", (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left + this.scrollX - this.headerWidth;
            const y = e.clientY - rect.top + this.scrollY - this.headerHeight;

            const { row, col } = this.getCellFromCoords(x, y);

            if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
                this.editCell(row, col);
            }
        });

        this.inputEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                this.saveCellValue();
            }
        });
        this.inputEl.addEventListener("blur", () => {
            this.saveCellValue();
        });

        window.addEventListener("resize", () => this.resizeCanvas());
        this.canvas.addEventListener("wheel", (e) => this.onWheel(e), {
            passive: false,
        });
        this.canvas.addEventListener("mousedown", (e) => this.onMouseDown(e));
        this.canvas.addEventListener("mouseup", () => this.onMouseUp());
        this.canvas.addEventListener("mouseleave", () => this.onMouseUp());
        this.canvas.addEventListener("mousemove", (e) => this.onMouseMove(e));

        window.addEventListener('keydown', (e: KeyboardEvent) => this.handleKeyDown(e));

        window.addEventListener("keydown", (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key.toLowerCase() === "z") {
                if (undoStk) {
                    let undoAction: EditAction | Resize = undoStk.pop()!;
                    redoStk.push(undoAction);
                    if ("type" in undoAction) {
                        if (undoAction.type === "col") {
                            grid.colWidths[undoAction.index] = undoAction.oldSize;
                        } else {
                            grid.rowHeights[undoAction.index] = undoAction.oldSize;
                        }
                        grid.updatePrefixSums();
                    } else {
                        grid.cells[undoAction.row]![undoAction.col]!.value = undoAction.oldVal;
                    }
                    grid.draw();
                }
            }
        });

        window.addEventListener("keydown", (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key.toLowerCase() === "y") {
                if (redoStk) {
                    let redoAction: EditAction | Resize = redoStk.pop()!;
                    undoStk.push(redoAction);
                    if ("type" in redoAction) {
                        if (redoAction.type === "col") {
                            grid.colWidths[redoAction.index] = redoAction.newSize;
                        } else {
                            grid.rowHeights[redoAction.index] = redoAction.newSize;
                        }
                        grid.updatePrefixSums();
                    } else {
                        grid.cells[redoAction.row]![redoAction.col]!.value = redoAction.newVal;
                    }
                    grid.draw();
                }
            }
        });
    }

    private editCell(row: number, col: number): void {
        const cell = this.cells[row]![col]!;
        const rect = this.canvas.getBoundingClientRect();

        this.inputEl.style.left = `${rect.left + (col ? this.colPrefixSums[col - 1] as number : 0) - this.scrollX + this.headerWidth}px`;
        this.inputEl.style.top = `${rect.top + (row ? this.rowPrefixSums[row - 1] as number : 0) - this.scrollY + this.headerHeight}px`;
        this.inputEl.style.width = `${this.colWidths[col] as number - 2}px`;
        this.inputEl.style.height = `${this.rowHeights[row] as number - 2}px`;
        this.inputEl.value = cell.value ?? "";
        this.inputEl.style.display = "block";
        this.inputEl.focus();

        this.inputEl.dataset.row = row.toString();
        this.inputEl.dataset.col = col.toString();
    }

    private saveCellValue(): void {
        const row = parseInt(this.inputEl.dataset.row || "-1", 10);
        const col = parseInt(this.inputEl.dataset.col || "-1", 10);

        const oldVal = this.cells[row]![col]!.value || "";
        const newVal = this.inputEl.value;
        undoStk.push({ row, col, oldVal, newVal })

        if (row >= 0 && col >= 0) {
            this.cells[row]![col]!.value = newVal;
        }

        this.inputEl.style.display = "none";
        this.draw();
    }

    private renameHeader(index: number): string {
        let label = '';
        while (index >= 0) {
            label = String.fromCharCode((index % 26) + 65) + label;
            index = Math.floor(index / 26) - 1;
        }
        return label;
    }

    private isCellSelected(row: number, col: number): boolean {
        if (!this.selection) return false;
        return row >= this.selection.startRow &&
            row <= this.selection.endRow &&
            col >= this.selection.startCol &&
            col <= this.selection.endCol;
    }

    private calculateMetrics(): void {
        if (!this.selection) return;
        const norm = this.selection;

        let count = 0;
        let sum = 0;
        let min: number | null = null;
        let max: number | null = null;

        for (let r = norm.startRow; r <= norm.endRow; r++) {
            for (let c = norm.startCol; c <= norm.endCol; c++) {
                const rawValue = this.cells[r]![c]!.value;

                if (rawValue !== null && rawValue !== undefined && rawValue.trim() !== "") {
                    const num = Number(rawValue);
                    if (!isNaN(num)) {
                        count++;
                        sum += num;
                        if (min === null || num < min) min = num;
                        if (max === null || num > max) max = num;
                    }
                }
            }
        }

        const average = count > 0 ? (sum / count) : null;

        document.getElementById("m-count")!.innerText = count.toString();
        document.getElementById("m-min")!.innerText = (min) ? min.toString() : "N/A";
        document.getElementById("m-max")!.innerText = (max) ? max.toString() : "N/A";
        document.getElementById("m-sum")!.innerText = sum.toString();
        document.getElementById("m-avg")!.innerText = (average) ? average.toString() : "N/A";
    }

    private handleKeyDown(e: KeyboardEvent): void {
        if (Math.max(this.dragStartCell.col, this.dragStartCell.row) < 0) return;
        switch (e.key) {
            case 'ArrowUp':
                if (this.dragStartCell.row > 0) {
                    this.dragStartCell.row--;
                    this.dragTarget = "cells";
                    this.selection = { startRow: this.dragStartCell.row, startCol: this.dragStartCell.col, endRow: this.dragStartCell.row, endCol: this.dragStartCell.col }
                }
                e.preventDefault();
                break;
            case 'ArrowDown':
                if (this.dragStartCell.row < this.rows - 1) {
                    this.dragStartCell.row++;
                    this.dragTarget = "cells";
                    this.selection = { startRow: this.dragStartCell.row, startCol: this.dragStartCell.col, endRow: this.dragStartCell.row, endCol: this.dragStartCell.col }
                }
                e.preventDefault();
                break;
            case 'ArrowLeft':
                if (this.dragStartCell.col > 0) {
                    this.dragStartCell.col--;
                    this.dragTarget = "cells";
                    this.selection = { startRow: this.dragStartCell.row, startCol: this.dragStartCell.col, endRow: this.dragStartCell.row, endCol: this.dragStartCell.col }
                }
                e.preventDefault();
                break;
            case 'ArrowRight':
                if (this.dragStartCell.col < this.cols - 1) {
                    this.dragStartCell.col++;
                    this.dragTarget = "cells";
                    this.selection = { startRow: this.dragStartCell.row, startCol: this.dragStartCell.col, endRow: this.dragStartCell.row, endCol: this.dragStartCell.col }
                }
                e.preventDefault();
                break;
            default:
                return;
        }
        this.draw();
    }
}

window.addEventListener("DOMContentLoaded", () => {
    canvas = document.getElementById("grid") as HTMLCanvasElement;
    grid = new CanvasGrid(canvas, 100_000, 500, 80, 25);
});
