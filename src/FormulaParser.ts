import type { GridDataStore } from "./data/GridDataStore.js";

export class FormulaParser {
    static evaluate(formula: string, dataStore: GridDataStore): string {
        if (!formula.startsWith('=')) return formula;
        
        let expr = formula.substring(1).replace(/\s+/g, '');
        
        try {
            expr = expr.replace(/[A-Z]+[0-9]+/g, (match) => {
                const colCode = match.match(/[A-Z]+/)?.[0] || '';
                const rowStr = match.match(/[0-9]+/)?.[0] || '';
                
                const col = colCode.split('').reduce((r, a) => r * 26 + a.charCodeAt(0) - 65, 0);
                const row = parseInt(rowStr, 10) - 1;

                const cellValue = dataStore.getValue(row, col);
                return cellValue || '';
            });

            if (/^[0-9+\-*/().]+$/.test(expr)) {
                const result = new Function(`return ${expr}`)();
                return result.toString();
            }
            return '#ERROR!';
        } catch {
            return '#ERROR!';
        }
    }
}
