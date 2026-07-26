# TypeScript Coding Interview: Concurrent Task Runner

You have **45 minutes**. Explain your approach and trade-offs as you work, and ask clarifying questions when needed.

## Problem

A backend service needs to process many independent jobs without overwhelming an external API. Implement:

```ts
async function runWithLimit<T, R>(
  items: readonly T[],
  worker: (item: T, index: number) => Promise<R>,
  concurrency: number,
): Promise<TaskResult<R>[]>
```

Define `TaskResult<R>` as a discriminated union representing either a successful or failed task.

## Requirements

- Run no more than `concurrency` workers at the same time.
- Start another item as soon as a running worker settles.
- Process every item in the input array.
- Preserve input order in the returned array, regardless of completion order.
- Capture each error in its corresponding result instead of rejecting the entire operation.
- Treat caught errors as `unknown`; do not use `any`.
- Return an empty array without invoking `worker` when `items` is empty.
- Throw a helpful error when `concurrency` is not a positive integer.
- Do not use external libraries in the implementation.

## Example

```ts
const results = await runWithLimit(
  ["a", "b", "c"],
  async (value, index) => {
    await delay((3 - index) * 10);

    if (value === "b") {
      throw new Error("Request failed");
    }

    return value.toUpperCase();
  },
  2,
);

// Expected shape:
[
  { status: "fulfilled", value: "A" },
  { status: "rejected", reason: /* unknown */ },
  { status: "fulfilled", value: "C" },
];
```

The result type should allow TypeScript to narrow each result safely:

```ts
for (const result of results) {
  if (result.status === "fulfilled") {
    console.log(result.value);    // R
  } else {
    console.error(result.reason); // unknown
  }
}
```

## Follow-up discussion

1. State the time and space complexity.
2. Describe how you would test that the concurrency limit is never exceeded.
3. Explain what happens when `worker` throws synchronously instead of returning a rejected promise.
4. Discuss how you would add cancellation using `AbortSignal`.
