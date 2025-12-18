/**
 * Async Utilities
 */

/**
 * Merge multiple async iterators into a single async iterator.
 * This allows processing events from multiple parallel sources as they arrive.
 *
 * @param iterators - Array of async iterators to merge
 * @returns A single async iterator that yields values from all input iterators
 */
export async function* mergeIterators<T>(
  iterators: AsyncIterable<T>[]
): AsyncGenerator<T, void, unknown> {
  const sources = iterators.map((iter) => iter[Symbol.asyncIterator]());
  const nextPromises = sources.map((source, index) =>
    source.next().then((result) => ({ index, result }))
  );

  // Keep track of active sources
  let activeCount = sources.length;

  try {
    while (activeCount > 0) {
      // Wait for the next value from any source
      const { index, result } = await Promise.race(
        nextPromises.filter((p) => p !== null) as Promise<{
          index: number;
          result: IteratorResult<T>;
        }>[]
      );

      if (result.done) {
        // Source finished
        nextPromises[index] = null as any; // Mark as finished
        activeCount--;
      } else {
        // Yield value
        yield result.value;

        // Queue next value from this source
        nextPromises[index] = sources[index]
          .next()
          .then((nextResult) => ({ index, result: nextResult }));
      }
    }
    } finally {
    // Cleanup: try to close any remaining iterators if we stop early
    for (const source of sources) {
      if (source.return) {
        try {
          await source.return();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  }
}

/**
 * Split an async iterator into two independent async iterators.
 * This allows multiple consumers to read from the same source stream.
 *
 * @param iterator - The source async iterator
 * @returns A tuple of two async generators that yield the same values
 */
export function teeAsync<T>(
  iterator: AsyncIterable<T>
): [AsyncGenerator<T, void, unknown>, AsyncGenerator<T, void, unknown>] {
  const source = iterator[Symbol.asyncIterator]();
  const results: Promise<IteratorResult<T>>[] = [];
  let doneReading = false;
  
  function getResult(i: number): Promise<IteratorResult<T>> {
    if (i >= results.length) {
      if (doneReading) return Promise.resolve({ value: undefined, done: true });
      
      const promise = source.next().then(res => {
        if (res.done) doneReading = true;
        return res;
      });
      results.push(promise);
      return promise;
    }
    return results[i];
  }

  async function* makeGenerator(): AsyncGenerator<T, void, unknown> {
    let i = 0;
    while (true) {
      const result = await getResult(i++);
      if (result.done) return;
      yield result.value;
    }
  }

  return [makeGenerator(), makeGenerator()];
}
