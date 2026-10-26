export function advanceTime(time, elapsed, rate, duration, loop) {
  if (!Number.isFinite(duration) || duration <= 0) return { time: 0, playing: false };
  const next = time + Math.max(0, elapsed) * rate;
  if (loop) return { time: ((next % duration) + duration) % duration, playing: true };
  return { time: Math.min(duration, Math.max(0, next)), playing: rate < 0 ? next > 0 : next < duration };
}

/** One scheduler owns playback. Inject a clock/RAF pair for deterministic tests. */
export function createPlayback(store, options = {}) {
  const request = options.requestFrame ?? (callback => globalThis.requestAnimationFrame(callback));
  const cancel = options.cancelFrame ?? (id => globalThis.cancelAnimationFrame(id));
  const now = options.now ?? (() => globalThis.performance.now());
  let scheduled = null, previous = null;
  function schedule() {
    if (scheduled === null && store.getState().timeline.playing) scheduled = request(tick);
  }
  function tick(timestamp) {
    scheduled = null;
    const { timeline, project } = store.getState();
    if (!timeline.playing) return;
    const elapsed = previous === null ? 0 : Math.max(0, timestamp - previous);
    previous = timestamp;
    store.dispatch({ type: 'timeline/tick', ...advanceTime(timeline.time, elapsed, timeline.rate, project.duration, timeline.loop) });
    schedule();
  }
  const unsubscribe = store.subscribe((state, action) => {
    if (!state.timeline.playing) {
      if (scheduled !== null) cancel(scheduled);
      scheduled = previous = null;
    } else {
      if (previous === null || ['timeline/seek', 'timeline/rate', 'project/duration'].includes(action.type)) previous = now();
      schedule();
    }
  });
  function play() {
    const { timeline, project } = store.getState();
    if (timeline.playing) return;
    if ((timeline.rate > 0 && timeline.time >= project.duration) || (timeline.rate < 0 && timeline.time <= 0)) {
      store.dispatch({ type: 'timeline/seek', time: timeline.rate < 0 ? project.duration : 0 });
    }
    store.dispatch({ type: 'timeline/playing', playing: true });
  }
  const pause = () => store.dispatch({ type: 'timeline/playing', playing: false });
  return {
    play, pause,
    toggle() { if (store.getState().timeline.playing) pause(); else play(); },
    stop() { pause(); store.dispatch({ type: 'timeline/seek', time: 0 }); },
    restart() { pause(); store.dispatch({ type: 'timeline/seek', time: store.getState().timeline.rate < 0 ? store.getState().project.duration : 0 }); play(); },
    reverse() { store.dispatch({ type: 'timeline/rate', rate: -store.getState().timeline.rate }); },
    seek(time) { pause(); store.dispatch({ type: 'timeline/seek', time }); },
    destroy() { pause(); unsubscribe(); },
  };
}
