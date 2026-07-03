/**
 * PerformanceMonitor
 *
 * Tracks runtime performance metrics for the application:
 *
 *   - Memory   (heap usage when available)
 *   - FPS      (frame timing, browser only)
 *   - Parse / Analyze / Plan / Render / Export timings
 *   - Event throughput
 *
 * The monitor is intentionally non-blocking. Everything is
 * tracked in memory and exposed via snapshots / subscribers.
 *
 * Browser-only features (FPS, memory) are guarded so the
 * monitor also works in Node tests.
 */

export class PerformanceMonitor {

    constructor({ logger = null, eventBus = null, events = null } = {}) {

        this.logger = logger;
        this.eventBus = eventBus || events;

        this.timings = new Map();           // name -> [{ duration, timestamp, label }]
        this.markers = new Map();           // name -> timestamp

        this.frameSamples = [];
        this.maxFrameSamples = 240;         // ~4 seconds @60fps

        this.rafHandle = null;
        this.lastFrameTs = null;
        this.fps = 0;

        this.eventCounters = new Map();
        this.errorCount = 0;

        this.history = [];

        this.subscribers = new Set();

        if (typeof window !== "undefined") {

            this._startFPS();

        }

        this._bindWorkflowEvents();

    }

    /* ---------- Workflow instrumentation (yêu cầu #10) ---------- */

    /**
     * Auto-record pipeline / task / stage timings from the
     * Workflow Engine events:
     *
     *     timings.pipeline          — whole run
     *     timings["task:parse"]     — per task (Parse/Analyze/...)
     *     timings["stage:parse/raw"]— per stage
     *
     * This is how "Parse Time / Export Time" show up in the
     * Developer Dashboard without any manual mark() calls.
     */
    _bindWorkflowEvents() {

        const bus = this.eventBus;

        if (!bus?.on) return;

        bus.on("workflow:pipeline:start", ({ pipelineId }) => {

            this.mark(`pipeline:${pipelineId}`);

        });

        const finishPipeline = ({ pipelineId }) => {

            this.measure("pipeline", `pipeline:${pipelineId}`, pipelineId);

        };

        bus.on("workflow:pipeline:complete", finishPipeline);
        bus.on("workflow:pipeline:failed", (payload) => {

            this.countError();

            finishPipeline(payload);

        });

        bus.on("workflow:pipeline:task:start", ({ pipelineId, taskId }) => {

            this.mark(`task:${pipelineId}:${taskId}`);

        });

        bus.on("workflow:pipeline:task:complete", ({ pipelineId, taskId }) => {

            this.measure(`task:${taskId}`, `task:${pipelineId}:${taskId}`, pipelineId);

        });

        bus.on("workflow:pipeline:stage:complete", ({ taskId, stageId, duration }) => {

            this._record(`stage:${taskId}/${stageId}`, duration ?? 0);

        });

        bus.on("error", () => this.countError());

    }

    /* ---------- Markers ---------- */

    mark(name) {

        this.markers.set(name, this._now());

    }

    measure(name, startMark, label = null) {

        const start = this.markers.get(startMark);

        const end = this._now();

        const duration = start != null ? end - start : 0;

        this._record(name, duration, label);

        if (start != null) this.markers.delete(startMark);

        return duration;

    }

    /**
     * Time a function call.
     */
    async time(name, fn, label = null) {

        const start = this._now();

        try {

            return await fn();

        } finally {

            const duration = this._now() - start;

            this._record(name, duration, label);

        }

    }

    _record(name, duration, label = null) {

        if (!this.timings.has(name)) this.timings.set(name, []);

        const samples = this.timings.get(name);

        samples.push({ duration, timestamp: this._now(), label });

        if (samples.length > 200) samples.shift();

        this._emit("timing", { name, duration, label });

    }

    /* ---------- Event counters ---------- */

    countEvent(name) {

        this.eventCounters.set(name, (this.eventCounters.get(name) || 0) + 1);

    }

    countError() {

        this.errorCount += 1;

    }

    /* ---------- FPS (browser) ---------- */

    _startFPS() {

        if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {

            return;

        }

        const tick = (ts) => {

            if (this.lastFrameTs != null) {

                const delta = ts - this.lastFrameTs;

                if (delta > 0) {

                    this.frameSamples.push(1000 / delta);

                    if (this.frameSamples.length > this.maxFrameSamples) {

                        this.frameSamples.shift();

                    }

                    this.fps = this._average(this.frameSamples);

                }

            }

            this.lastFrameTs = ts;

            this.rafHandle = window.requestAnimationFrame(tick);

        };

        this.rafHandle = window.requestAnimationFrame(tick);

    }

    stopFPS() {

        if (this.rafHandle != null && typeof window !== "undefined") {

            window.cancelAnimationFrame(this.rafHandle);

            this.rafHandle = null;

        }

    }

    /* ---------- Snapshots ---------- */

    memorySnapshot() {

        if (typeof performance !== "undefined" && performance.memory) {

            const m = performance.memory;

            return {
                usedJSHeapSize: m.usedJSHeapSize,
                totalJSHeapSize: m.totalJSHeapSize,
                jsHeapSizeLimit: m.jsHeapSizeLimit
            };

        }

        return null;

    }

    timingStats(name) {

        const samples = this.timings.get(name) || [];

        if (samples.length === 0) {

            return { count: 0, min: 0, max: 0, avg: 0, last: 0 };

        }

        const durations = samples.map(s => s.duration);

        return {
            count: samples.length,
            min: Math.min(...durations),
            max: Math.max(...durations),
            avg: this._average(durations),
            last: durations[durations.length - 1]
        };

    }

    allTimings() {

        const out = {};

        for (const [name] of this.timings) {

            out[name] = this.timingStats(name);

        }

        return out;

    }

    snapshot() {

        return {
            timestamp: this._now(),
            fps: Math.round(this.fps),
            memory: this.memorySnapshot(),
            timings: this.allTimings(),
            events: Object.fromEntries(this.eventCounters),
            errors: this.errorCount
        };

    }

    /* ---------- Subscriptions ---------- */

    subscribe(callback) {

        this.subscribers.add(callback);

        try { callback(this.snapshot()); } catch {}

        return () => this.subscribers.delete(callback);

    }

    _emit(type, payload) {

        for (const cb of this.subscribers) {

            try { cb(this.snapshot(), { type, payload }); } catch {}

        }

        this.eventBus?.emit?.(`perf:${type}`, payload);

    }

    /* ---------- helpers ---------- */

    _now() {

        if (typeof performance !== "undefined" && typeof performance.now === "function") {

            return performance.now();

        }

        return Date.now();

    }

    _average(samples) {

        if (!samples.length) return 0;

        return samples.reduce((a, b) => a + b, 0) / samples.length;

    }

}