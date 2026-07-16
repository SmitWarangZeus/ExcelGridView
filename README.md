# Excel Grid View

An Excel-like grid rendered entirely on HTML Canvas, built with TypeScript, supporting 100,000 rows x 500 columns with virtualized rendering, cell editing, row/column resizing, selection, range summaries, and undo/redo via the command pattern.

## 1. Project Objective

Build a performant, maintainable Excel-like grid without relying on one DOM element per cell and the command pattern for undo/redo.

## 2. How to Install and Run

```bash
npm install
npm run compile   # runs `tsc --watch`, emits to ./dist
```

Then open `frontend/index.html` in a browser 

```bash
npx serve .
```

To compile once without watching:

```bash
npx tsc
```

## 3. Features Implemented

- Canvas-rendered grid: cells, grid lines, row headers (1, 2, 3, ...) and column headers (A, B, ..., Z, AA, ...).
- Virtualized rendering for 100,000 rows x 500 columns — only the rows and columns intersecting the current viewport are drawn.
- 50,000+ JSON records generated and loaded into a sparse data store.
- Cell editing via an HTML `<input>` overlay (double-click or Enter).
- Column and row resizing by dragging header boundaries.
- Row selection, column selection, single-cell selection and range selection (drag or shift-less click-drag).
- "Select all" via the top-left corner.
- Count / min / max / sum / average for the current numeric selection, rendered as real HTML text in the status bar.
- Undo/redo (Ctrl+Z / Ctrl+Y) for cell edits, column resizes and row resizes, implemented with the command pattern.
- Keyboard navigation: arrow keys move the active cell, Enter starts editing, Escape cancels an edit.

## 4. Folder and Class Structure

```
src/
  GridConfig.ts          Shared constants (sizes, colors,tolerances)
  GridTypes.ts            Shared interfaces/types (CellRange, SummaryResult, ...)
  data/
    FenwickTree.ts           Binary Indexed Tree for O(log n) offset math
    RowColumnSizeStore.ts    RowModel/ColumnModel-equivalent: row heights & col widths
    GridDataStore.ts         Sparse cell-value storage
    JsonDataLoader.ts        Generates/loads JSON cell records
  commands/
    ICommand.ts              Command pattern contract
    CommandManager.ts        Undo/redo stacks
    EditCellCommand.ts       Undoable cell edit
    ResizeColumnCommand.ts   Undoable column resize
    ResizeRowCommand.ts      Undoable row resize
  ViewportManager.ts       Scroll state, visible-range math
  SelectionManager.ts      Active cell, selection range, drag state
  SummaryCalculator.ts     Count/min/max/sum/average over a range
  EditManager.ts           HTML input overlay + edit workflow
  GridRenderer.ts          All canvas drawing (headers, cells, selection)
  core/
    Grid.ts                  Main coordinator; owns DOM/event wiring
  main.ts                    Entry point: creates Grid, loads data, binds summary UI
```

### Class responsibilities

| Class | Responsibility |
|---|---|
| `Grid` | Coordinates every other class, owns the canvas element and all DOM event listeners (mouse, wheel, keyboard, resize), and is the only class aware of the browser event model. |
| `GridRenderer` | Pure drawing: reads from `RowColumnSizeStore`, `GridDataStore`, `SelectionManager` and `ViewportManager` and paints the visible viewport. Never mutates state. |
| `GridDataStore` | Sparse storage of cell values, keyed by `row * colCount + col`. Only populated cells consume memory. Provides range-scoped iteration for summaries. |
| `RowColumnSizeStore` | Row-height / column-width metadata, backed by two `FenwickTree`s, giving O(log n) resize and O(log n) offset lookups. |
| `FenwickTree` | Generic Binary Indexed Tree: point update, prefix sum, and "index containing offset" queries, all O(log n). |
| `ViewportManager` | Scroll position, clamping, and screen <-> grid coordinate conversions. No DOM/canvas access. |
| `SelectionManager` | Active cell, current selection range (cell/row/column/range), and drag-in-progress state. |
| `SummaryCalculator` | Computes count/min/max/sum/average for a `CellRange`, iterating only populated cells. |
| `EditManager` | Owns the HTML input overlay, and turns a commit into an `EditCellCommand` run through `CommandManager`. |
| `ICommand` | Contract (`execute`/`undo`) that all undoable actions implement. |
| `CommandManager` | Owns undo/redo stacks; depends only on `ICommand`. |
| `EditCellCommand` / `ResizeColumnCommand` / `ResizeRowCommand` | Concrete, independent undoable actions. |
| `JsonDataLoader` | Generates/validates/loads JSON `{row, col, value}` records into a `GridDataStore`. |

## 5. OOP Concepts Applied

- **Encapsulation**: each class exposes a narrow public API (e.g. `RowColumnSizeStore` never leaks its internal `FenwickTree`s).
- **Abstraction**: `ICommand` abstracts "an undoable action" so
  `CommandManager` never needs to know about edits vs. resizes.

## 6. SOLID Principles Applied

- **Single Responsibility**: rendering, data storage, viewport math, selection, editing and commands are all separate classes. `Grid` itself only coordinates and handles DOM events.
- **Open/Closed**: adding a new undoable action means writing a new class that implements `ICommand` — no changes to `CommandManager` or existing commands.
- **Liskov Substitution**: all three commands (`EditCellCommand`,
  `ResizeColumnCommand`, `ResizeRowCommand`) are fully interchangeable wherever `ICommand` is expected — `CommandManager` calls `execute()`/ `undo()` without any type-specific branching.
- **Interface Segregation**: `ICommand` only declares `execute`/`undo` — nothing else is forced onto command implementations.
- **Dependency Inversion**: `CommandManager` depends on the `ICommand` abstraction, not on concrete command classes; `EditManager` and `Grid` depend on `GridDataStore`/`RowColumnSizeStore` through their public methods rather than reaching into internals.

## 7. Command Pattern (Undo/Redo)

- `ICommand` defines `execute()` and `undo()`.
- `CommandManager` holds an undo stack and a redo stack. `executeCommand` runs the command and pushes it to the undo stack, clearing the redo stack. `undo()` pops from the undo stack, calls `.undo()`, and pushes onto the redo stack. `redo()` does the mirror operation, calling `.execute()` again.
- `EditCellCommand` stores `(row, col, oldValue, newValue)`. `ResizeColumnCommand` / `ResizeRowCommand` store `(index, oldSize, newSize)`. All three are small, independent, and fully reversible.
- Multiple sequential actions undo/redo in the correct LIFO order because each command captures its own before/after state at creation time.

## 8. Virtual Rendering

`GridRenderer.draw()` never iterates the full 100,000 x 500 grid. It asks `ViewportManager` for the first visible row/column, then walks forward row-by-row / column-by-column, breaking out of each loop as soon as the next row/column would fall outside the canvas bounds. Only visible cells are ever touched during a draw call, and scrolling only triggers a redraw of the visible viewport, not the whole grid.

## 9. Data Generation and Loading

`JsonDataLoader.generateRecords(rowLimit, colLimit, minRecordCount)` produces `{ row, col, value }` records for the first 50,000 rows and 5 columns, which is at least 50,000 records. `loadIntoStore` validates each record's shape before writing it into `GridDataStore`, so malformed records (missing fields, wrong types) are skipped rather than crashing the app.

## 10. Data Storage Approach

Cell values are stored sparsely in `GridDataStore`, using a `Map<number, string>` keyed by `row * colCount + col`. Empty cells consume no memory with 100,000 x 500 = 50,000,000 possible cells, only the ~250,000 generated cells are stored. Row heights and column widths are stored inside two `FenwickTree`s rather than plain arrays, so a single resize is O(log n) instead of requiring an O(n) prefix-sum rebuild.

## 11. Selection Model

`SelectionManager` tracks:
- `activeRow` / `activeCol`: the single "current" cell (arrow-key navigation target, edit target on Enter).
- `selection: CellRange | null`: the current highlighted rectangle.
- `dragTarget: 'cells' | 'rowHeader' | 'colHeader' | null`: which kind of drag is in progress, so `updateDragTo` knows whether to expand a cell range, a full-height column range, or a full-width row range.

Row/column selection is just a `CellRange` that spans the full height or width of the grid — no separate data structure is needed.

## 12. Summary Calculation

`SummaryCalculator.calculate(range)` iterates `GridDataStore.iterateNonEmptyInRange(range)`, which walks only the map of populated cells, filtering by row/col bounds. This means selecting the entire 100,000 x 500 grid does not scan 50 million cells. Values that are empty, whitespace-only, or non-numeric are skipped without breaking count/sum/min/max/average.

## 14. Performance Observations

- Initial load renders the first frame quickly, since only the visible viewport is drawn.
- Scrolling triggers a full redraw of the visible viewport on every `wheel` event.
- Resizing a row or column updates a single Fenwick tree node in O(log n) instead of rebuilding a 100,000-element prefix-sum array, which keeps drag-resize responsive even near the end of the sheet.
- Known limitation: No data persistence. Data is gone after every stopping and running application.

## 15. Accessibility Considerations

- Canvas is **not** automatically accessible to screen readers. This is a known, documented limitation of this implementation, not something fully solved here.
- Cell editing uses a real HTML `<input>` element, so it is keyboard-focusable and works with browser text editing behaviour.
- Summary values (count/min/max/sum/average) are rendered as real HTML text in the status bar, not drawn on canvas, so they are readable by assistive technology.
- Keyboard navigation (arrows, Enter, Escape, Ctrl+Z/Ctrl+Y) works without requiring mouse interaction.
- Selection is indicated both by a fill color and by a distinct cell border, rather than color alone.

## 16. Known Limitations and Next Improvements

- No ARIA grid semantics are implemented.
- Only single-range selection is supported (no Ctrl/Cmd-click multi-range selection, as in real Excel).
- Column/row resize handles are detected within the header band only.
- No persistence — reloading the page regenerates new data.