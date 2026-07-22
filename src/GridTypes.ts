import type { ColResize } from "./Resize/ColResize.js";
import type { RowResize } from "./Resize/RowResize.js";
import type { ColHeaderSelection } from "./Selection/ColHeaderSelection.js";
import type { GridSelection } from "./Selection/GridSelection.js";
import type { RowHeaderSelection } from "./Selection/RowHeaderSelection.js";
import type { SubGridSelection } from "./Selection/SubGridSelection.js";

export interface CellPosition {
    row: number;
    col: number;
}

export interface CellRange {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
}

export type DragTargetType = "cells" | "rowHeader" | "colHeader" | null;

export type ResizeAxis = "row" | "col";

export interface ResizeState {
    axis: ResizeAxis;
    index: number;
    startPos: number;
    oldSize: number;
}

export interface SummaryResult {
    count: number;
    sum: number;
    min: number | null;
    max: number | null;
    average: number | null;
}

export interface CellRecord {
    row: number;
    col: number;
    value: string;
}

export interface EmployeeRecord {
    id: number;
    firstName: string;
    lastName: string;
    age: number;
    salary: number;
}

export interface PixelRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export type ActiveHandler = ColHeaderSelection | GridSelection | RowHeaderSelection | SubGridSelection | ColResize | RowResize | null;