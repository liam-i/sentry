import {ProfileGroup} from './importProfile';

function isChromeTraceObjectFormat(input: any): input is ChromeTrace.ObjectFormat {
  return typeof input === 'object' && 'traceEvents' in input;
}

function isChromeTraceArrayFormat(input: any): input is ChromeTrace.ArrayFormat {
  return Array.isArray(input);
}

export function parseChromeTrace(input: string | ChromeTrace.ProfileType): ProfileGroup {
  if (isChromeTraceObjectFormat(input)) {
    // @TODO
  }
  if (isChromeTraceArrayFormat(input)) {
    return parseChromeTraceArrayFormat(input);
  }

  throw new Error('Failed to parse trace input format');
}

type ProcessId = number;
type ThreadId = number;

export function splitEventsByProcessAndTraceId(
  trace: ChromeTrace.ArrayFormat
): Record<ProcessId, Record<ThreadId, ChromeTrace.Event[]>> {
  const collections: Record<ProcessId, Record<ThreadId, ChromeTrace.Event[]>> = {};

  for (let i = 0; i < trace.length; i++) {
    if (typeof trace[i].pid !== 'number') {
      continue;
    }
    if (typeof trace[i].tid !== 'number') {
      continue;
    }

    const event = trace[i];

    if (!collections[event.pid]) {
      collections[event.pid] = {};
    }
    if (!collections[event.pid][event.tid]) {
      collections[event.pid][event.tid] = [];
    }

    collections[event.pid][event.tid].push(event);
  }

  return collections;
}

export function parseChromeTraceArrayFormat(
  input: ChromeTrace.ArrayFormat
): ProfileGroup {
  const eventsByProcessAndThreadID = splitEventsByProcessAndTraceId(input);

  return {
    name: 'chrometrace',
    traceID: '',
    activeProfileIndex: 0,
    profiles: [],
  };
}
