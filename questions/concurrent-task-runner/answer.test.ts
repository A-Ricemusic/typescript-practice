import { setTimeout as delay } from "node:timers/promises";

import { describe, expect, it, vi } from "vitest";

import { runWithLimit } from "./answer.ts";

describe("runWithLimit", () => {
    it("returns results in input order when work finishes out of order", async () => {
        const completionOrder: number[] = [];
        const delays = [30, 5, 15];

        const results = await runWithLimit(
            ["slow", "fast", "medium"],
            async (item, index) => {
                await delay(delays[index]!);
                completionOrder.push(index);
                return item.toUpperCase();
            },
            3,
        );

        expect(completionOrder).toEqual([1, 2, 0]);
        expect(results).toEqual([
            { status: "fulfilled", value: "SLOW" },
            { status: "fulfilled", value: "FAST" },
            { status: "fulfilled", value: "MEDIUM" },
        ]);
    });

    it("never exceeds the concurrency limit", async () => {
        let activeWorkers = 0;
        let maximumActiveWorkers = 0;

        const results = await runWithLimit(
            [1, 2, 3, 4, 5, 6, 7],
            async (item) => {
                activeWorkers++;
                maximumActiveWorkers = Math.max(maximumActiveWorkers, activeWorkers);
                await delay(10);
                activeWorkers--;
                return item * 2;
            },
            3,
        );

        expect(maximumActiveWorkers).toBe(3);
        expect(results).toEqual(
            [2, 4, 6, 8, 10, 12, 14].map((value) => ({
                status: "fulfilled",
                value,
            })),
        );
    });

    it("records rejected promises without rejecting the entire run", async () => {
        const failure = new Error("Request failed");

        const results = await runWithLimit(
            ["a", "b", "c"],
            async (item) => {
                if (item === "b") throw failure;
                return item.toUpperCase();
            },
            2,
        );

        expect(results).toEqual([
            { status: "fulfilled", value: "A" },
            { status: "rejected", reason: failure },
            { status: "fulfilled", value: "C" },
        ]);
    });

    it("captures a worker that throws synchronously", async () => {
        const worker = (item: number): Promise<number> => {
            if (item === 2) throw "synchronous failure";
            return Promise.resolve(item);
        };

        await expect(runWithLimit([1, 2, 3], worker, 2)).resolves.toEqual([
            { status: "fulfilled", value: 1 },
            { status: "rejected", reason: "synchronous failure" },
            { status: "fulfilled", value: 3 },
        ]);
    });

    it("returns an empty array without invoking the worker", async () => {
        const worker = vi.fn(async (item: number) => item);

        await expect(runWithLimit([], worker, 2)).resolves.toEqual([]);
        expect(worker).not.toHaveBeenCalled();
    });

    it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
        "rejects invalid concurrency value %s",
        async (concurrency) => {
            await expect(
                runWithLimit([1], async (item) => item, concurrency),
            ).rejects.toThrow("concurrency must be a positive integer");
        },
    );
});
