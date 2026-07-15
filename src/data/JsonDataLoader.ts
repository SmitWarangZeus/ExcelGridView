import type { CellRecord, EmployeeRecord } from "../GridTypes.js";
import { GridDataStore } from "./GridDataStore.js";
import employees from "../data/employees.json" with { type: "json" };

export class JsonDataLoader {
    public static readonly COLUMNS = {
        ID: 0,
        FIRST_NAME: 1,
        LAST_NAME: 2,
        AGE: 3,
        SALARY: 4,
    } as const;

    // public static async loadFromUrl(url: string): Promise<EmployeeRecord[]> {
    //     const response = await fetch(url);
    //     if (!response.ok) {
    //         throw new Error(`Failed to load JSON data file "${url}": ${response.status} ${response.statusText}`);
    //     }

    //     const parsed: unknown = await response.json();
    //     if (!Array.isArray(parsed)) {
    //         throw new Error(`JSON data file "${url}" must contain an array of employee records.`);
    //     }

    //     return parsed as EmployeeRecord[];
    // }

    public static mapEmployeesToCellRecords(employees: EmployeeRecord[]): CellRecord[] {
        const records: CellRecord[] = [];

        employees.forEach((employee, rowIndex) => {
            if (!this.isValidEmployee(employee)) {
                return;
            }
            const { ID, FIRST_NAME, LAST_NAME, AGE, SALARY } = this.COLUMNS;
            records.push({ row: rowIndex, col: ID, value: employee.id.toString() });
            records.push({ row: rowIndex, col: FIRST_NAME, value: employee.firstName });
            records.push({ row: rowIndex, col: LAST_NAME, value: employee.lastName });
            records.push({ row: rowIndex, col: AGE, value: employee.age.toString() });
            records.push({ row: rowIndex, col: SALARY, value: employee.salary.toString() });
        });

        return records;
    }

    public static async loadEmployeesFromUrlIntoStore(store: GridDataStore): Promise<number> {
        const records = this.mapEmployeesToCellRecords(employees);
        this.loadIntoStore(records, store);
        return records.length / Object.keys(this.COLUMNS).length;
    }

    public static loadIntoStore(records: CellRecord[], store: GridDataStore): void {
        for (const record of records) {
            if (!this.isValidCellRecord(record)) {
                continue;
            }
            store.setValue(record.row, record.col, record.value);
        }
    }

    private static isValidCellRecord(record: CellRecord): boolean {
        return (
            typeof record.row === "number" &&
            typeof record.col === "number" &&
            record.row >= 0 &&
            record.col >= 0 &&
            typeof record.value === "string"
        );
    }

    private static isValidEmployee(employee: EmployeeRecord): boolean {
        return (
            !!employee &&
            typeof employee.id === "number" &&
            typeof employee.firstName === "string" &&
            typeof employee.lastName === "string" &&
            typeof employee.age === "number" &&
            typeof employee.salary === "number"
        );
    }
}
