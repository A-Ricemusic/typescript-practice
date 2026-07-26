type TaskResult<R> =  { status: "fulfilled"; value: R} |
{ status: "rejected"; reason: unknown };



async function runWithLimit<T,R>(
    items: readonly T[],
    worker: (item: T, index: number) => Promise<R>,
    concurrency: number,
): Promise<TaskResult<R>[]> {
    
    if (!Number.isInteger(concurrency) || concurrency <= 0) {
        throw new Error("concurrency must be a positive integer")
    }

    let nextIndex: number = 0
    const results: TaskResult<R>[] = new Array(items.length);

    async function runNext(): Promise<void> {
        while (nextIndex < items.length) {
            const currentIndex = nextIndex;
            nextIndex++;

            const item = items[currentIndex]!;
            try {
                const value = await worker(item, currentIndex);
                results[currentIndex] = { status: "fulfilled", value,}
            } catch (reason: unknown) {
                results[currentIndex] = { status: "rejected", reason}
            }
        }
    }

    let runnerCount: number = Math.min(concurrency, items.length);
    let runnerCalls: Promise<void>[] = Array.from(
        { length: runnerCount},
        () => runNext(),
    );

    await Promise.all(runnerCalls);
    return results
}