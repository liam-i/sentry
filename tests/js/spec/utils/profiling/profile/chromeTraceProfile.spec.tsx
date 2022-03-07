import {splitEventsByProcessAndTraceId} from 'sentry/utils/profiling/profile/chromeTraceProfile';

describe('splitEventsByProcessAndTraceId', () => {
  it('splits by thread id', () => {
    const trace: ChromeTrace.ArrayFormat = [
      {
        ph: 'B',
        tid: 0,
        pid: 0,
        cat: '',
        name: '',
        ts: 0,
        args: [],
      },
      {
        ph: 'B',
        tid: 1,
        pid: 0,
        cat: '',
        name: '',
        ts: 0,
        args: [],
      },
    ];

    expect(splitEventsByProcessAndTraceId(trace)[0][0]).toEqual([trace[0]]);
    expect(splitEventsByProcessAndTraceId(trace)[0][1]).toEqual([trace[1]]);
  });
});
