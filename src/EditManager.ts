import { GridDataStore } from "./data/GridDataStore.js";
import { CommandManager } from "./commands/CommandManager.js";
import { EditCellCommand } from "./commands/EditCellCommand.js";
import type { PixelRect } from "./GridTypes.js";
import { FormulaParser } from "./FormulaParser.js";

export class EditManager {
    private readonly inputEl: HTMLInputElement;
    private editingRow = -1;
    private editingCol = -1;
    private valueBeforeEdit = "";

    constructor(
        private readonly dataStore: GridDataStore,
        private readonly commandManager: CommandManager,
        private readonly onChange: () => void,
    ) {
        this.inputEl = this.createInputElement();
        this.inputEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                this.commit();
            } else if (e.key === "Escape") {
                this.cancel();
            }
        });
        this.inputEl.addEventListener("blur", () => this.commit());
    }

    public isEditing(): boolean {
        return this.editingRow >= 0 && this.editingCol >= 0;
    }

    public beginEdit(row: number, col: number, screenRect: PixelRect): void {
        this.editingRow = row;
        this.editingCol = col;
        this.valueBeforeEdit = this.dataStore.getValue(row, col);

        this.inputEl.style.left = `${screenRect.x}px`;
        this.inputEl.style.top = `${screenRect.y}px`;
        this.inputEl.style.width = `${screenRect.width}px`;
        this.inputEl.style.height = `${screenRect.height}px`;
        this.inputEl.value = this.valueBeforeEdit;
        this.inputEl.style.display = "block";
        this.inputEl.focus();
    }

    public commit(): void {
        if (!this.isEditing()) {
            return;
        }
        const row = this.editingRow;
        const col = this.editingCol;
        let newValue = this.inputEl.value;
        const oldValue = this.valueBeforeEdit;

        this.hideInput();

        if (newValue !== oldValue) {
            if (newValue.startsWith("=")){
                newValue = FormulaParser.evaluate(newValue, this.dataStore);
            }
            const command = new EditCellCommand(this.dataStore, row, col, oldValue, newValue, this.onChange);
            this.commandManager.executeCommand(command);
        } else {
            this.onChange();
        }
    }

    public cancel(): void {
        if (!this.isEditing()) {
            return;
        }
        this.hideInput();
        this.onChange();
    }

    private hideInput(): void {
        this.inputEl.style.display = "none";
        this.editingRow = -1;
        this.editingCol = -1;
    }

    private createInputElement(): HTMLInputElement {
        const input = document.createElement("input");
        input.type = "text";
        input.style.position = "fixed";
        input.style.display = "none";
        input.style.border = "1px solid #000";
        input.style.font = "12px Arial";
        input.style.boxSizing = "border-box";
        document.body.appendChild(input);
        return input;
    }
}
