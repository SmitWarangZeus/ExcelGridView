export class FenwickTree {
    private readonly tree: number[];
    private readonly size: number;
    private readonly highestPowerOfTwo: number;

    constructor(initialSizes: number[]) {
        this.size = initialSizes.length;
        this.tree = new Array<number>(this.size + 1).fill(0);

        for (let i = 0; i < this.size; i++) {
            this.applyDelta(i, initialSizes[i] ?? 0);
        }

        let power = 1;
        while (power * 2 <= this.size) {
            power *= 2;
        }
        this.highestPowerOfTwo = power;
    }

    public prefixSum(index: number): number {
        if (index < 0) {
            return 0;
        }
        let i = Math.min(index + 1, this.size);
        let sum = 0;
        while (i > 0) {
            sum += this.tree[i] ?? 0;
            i -= i & -i;
        }
        return sum;
    }

    public total(): number {
        return this.prefixSum(this.size - 1);
    }

    public getSize(index: number): number {
        return this.prefixSum(index) - this.prefixSum(index - 1);
    }

    public setSize(index: number, newSize: number): void {
        const delta = newSize - this.getSize(index);
        if (delta !== 0) {
            this.applyDelta(index, delta);
        }
    }

    public findIndexForOffset(offset: number): number {
        if (offset < 0) {
            return -1;
        }
        if (this.size === 0) {
            return -1;
        }
        if (offset >= this.total()) {
            return this.size - 1;
        }

        let position = 0;
        let remaining = offset;

        for (let step = this.highestPowerOfTwo; step > 0; step >>= 1) {
            const next = position + step;
            if (next <= this.size && (this.tree[next] ?? 0) <= remaining) {
                position = next;
                remaining -= this.tree[next] ?? 0;
            }
        }

        return position;
    }

    private applyDelta(index: number, delta: number): void {
        let i = index + 1;
        while (i <= this.size) {
            this.tree[i] = (this.tree[i] ?? 0) + delta;
            i += i & -i;
        }
    }
}
