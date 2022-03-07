import {Frame} from 'sentry/utils/profiling/frame';

type FrameIndex = Record<string | number, Frame>;

export function createFrameIndex(
  frames: Profiling.Schema['shared']['frames']
): FrameIndex;
export function createFrameIndex(
  frames: JSSelfProfiling.Frame[],
  trace: JSSelfProfiling.Trace
): FrameIndex;
export function createFrameIndex(
  frames: Profiling.Schema['shared']['frames'] | JSSelfProfiling.Frame[],
  trace?: JSSelfProfiling.Trace
): FrameIndex {
  if (trace) {
    return (frames as JSSelfProfiling.Frame[]).reduce((acc, frame, index) => {
      acc[index] = new Frame(
        {
          key: index,
          resource:
            frame.resourceId !== undefined
              ? trace.resources[frame.resourceId]
              : undefined,
          ...frame,
        },
        'web'
      );
      return acc;
    }, {});
  }

  return (frames as Profiling.Schema['shared']['frames']).reduce((acc, frame, index) => {
    acc[index] = new Frame({
      key: index,
      ...frame,
    });
    return acc;
  }, {});
}

type Cache<Arguments extends ReadonlyArray<any> | any, Value> = {
  args: Arguments;
  value: Value;
};

export function memoizeByReference<Arguments, Value>(
  fn: (args: Arguments) => Value
): (t: Arguments) => Value {
  let cache: Cache<Arguments, Value> | null = null;

  return function memoizeByReferenceCallback(args: Arguments) {
    // If this is the first run then eval the fn and cache the result
    if (!cache) {
      cache = {args, value: fn(args)};
      return cache.value;
    }
    // If args match by reference, then return cached value
    if (cache.args === args && cache.args !== undefined && args !== undefined) {
      return cache.value;
    }

    // Else eval the fn and store the new value
    cache.args = args;
    cache.value = fn(args);
    return cache.value;
  };
}

export function memoizeVariadicByReference<Arguments, Value>(
  fn: (...args: ReadonlyArray<Arguments>) => Value
): (...t: ReadonlyArray<Arguments>) => Value {
  let cache: Cache<ReadonlyArray<Arguments>, Value> | null = null;

  return function memoizeByReferenceCallback(...args: ReadonlyArray<Arguments>) {
    // If this is the first run then eval the fn and cache the result
    if (!cache) {
      cache = {args, value: fn(...args)};
      return cache.value;
    }
    // If args match by reference, then return cached value
    if (
      cache.args.length === args.length &&
      cache.args.length !== 0 &&
      args.length !== 0 &&
      args.every((arg, i) => arg === cache?.args[i])
    ) {
      return cache.value;
    }

    // Else eval the fn and store the new value
    cache.args = args;
    cache.value = fn(...args);
    return cache.value;
  };
}

function swapInPlace<T extends Array<any>>(from: number, to: number, arr: T): void {
  const tmp = arr[from];
  arr[from] = arr[to];
  arr[to] = tmp;
}

interface HeapNode<T> {
  node: T;
  value: number;
}

class HeapNode<T> implements HeapNode<T> {
  constructor(value: number, node: T) {
    this.value = value;
    this.node = node;
  }
}

export class MinHeap<T> {
  public size: number = 0;
  public heap: HeapNode<T>[] = new Array();
  private cursor: number = -1;

  constructor(size?: number) {
    if (typeof size === 'number' && !isNaN(size)) {
      this.size = size;
      this.heap = new Array(this.size);
    }
  }

  insert(value: number, node: T) {
    this.cursor++;

    if (this.cursor > this.heap.length - 1) {
      // Array needs resizing, make sure resize is synchronous
    }

    this.heap[this.cursor] = new HeapNode(value, node);

    let index = this.cursor;
    let parentIndex = Math.floor(index / 2);
    let current = this.heap[index];

    while (current && current.value < this.heap[parentIndex].value) {
      swapInPlace(index, parentIndex, this.heap);
      index = parentIndex;
      parentIndex = Math.floor(index / 2);
      current = this.heap[index];
    }
  }
  delete(): HeapNode<T> {
    // @TODO
    return this.heap[this.heap.length - 1];
  }
}
