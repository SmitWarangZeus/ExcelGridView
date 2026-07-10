export const GridConfig = {
    DEFAULT_ROW_COUNT: 100_000,
    DEFAULT_COL_COUNT: 500,
    GENERATED_RECORD_ROW_LIMIT: 50_000,
    GENERATED_RECORD_COL_LIMIT: 5,

    DEFAULT_CELL_WIDTH: 80,
    DEFAULT_CELL_HEIGHT: 25,
    MIN_COL_WIDTH: 20,
    MIN_ROW_HEIGHT: 15,

    HEADER_HEIGHT: 25,
    HEADER_WIDTH: 50,

    RESIZE_HANDLE_TOLERANCE_PX: 5,

    CELL_FONT: "12px Arial",

    COLORS: {
        gridLine: "#cccccc",
        cellText: "#000000",
        selectionFill: "rgba(33, 115, 70, 0.1)",
        activeCellBorder: "#217346",
        headerBackground: "#f3f2f1",
        headerBackgroundSelected: "#e1dfdd",
        headerBorder: "#c8c6c4",
        headerText: "#333333",
        cornerBackground: "#f1f3f5",
    },
} as const;
