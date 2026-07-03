/**
 * CrashReporter
 *
 * Captures uncaught errors and unhandled promise rejections,
 * builds a structured crash report, and forwards it to any
 * registered sinks (console, localStorage, download, etc.).
 *
 * Reports contain:
 *   - id, timestamp, message, stack
 *   - source (window / promise / manual)
 *   - breadcrumbs (the last N events we tracked)
 *   - context (memory snapshot, route, etc.)
 */

const DEFAULT_BREADCRUMB_LIMIT = 50;

export class CrashReporter {

    constructor({
        logger = null,
        eventBus = null,
        store = null,
        performanceMonitor = null,
        sinks = null,
        breadcrumbLimit = DEFAULT_BREADCRUMB_LIMIT
    } = {}) {

        this.logger = logger;
        this.eventBus = eventBus;
        this.store = store;
        this.performanceMonitor = performanceMonitor;

        this.breadcrumbs = [];
        this.breadcrumbLimit = breadcrumbLimit;

        this.reports = [];
        this.maxReports = 50;

        this.sinks = sinks || [];

        this._bound = false;

    }

    /* ---------- lifecycle ---------- */

    install() {

        if (this._bound || typeof window === "undefined") return;

        window.addEventListener("error", (event) => this._captureFromWindow(event));
        window.addEventListener("unhandledrejection", (event) => this._captureFromPromise(event));

        this.eventBus?.on?.("error", payload => this.report(payload?.error || payload, { source: "event-bus" }));

        this._bound = true;

    }

    /* ---------- breadcrumbs ---------- */

    breadcrumb(message, level = "info", data = null) {

        this.breadcrumbs.push({
            timestamp: Date.now(),
            level,
            message,
            data
        });

        if (this.breadcrumbs.length > this.breadcrumbLimit) {

            this.breadcrumbs.shift();

        }

    }

    /* ---------- capture ---------- */

    report(error, context = {}) {

        const err = this._normalizeError(error);

        const report = {
            id: `crash-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
            timestamp: new Date().toISOString(),
            timestampMs: Date.now(),
            message: err.message,
            name: err.name,
            stack: err.stack,
            source: context.source || "manual",
            breadcrumbs: [...this.breadcrumbs],
            context: {
                route: this.store?.get?.("router.current"),
                url: typeof location !== "undefined" ? location.href : null,
                userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
                memory: this.performanceMonitor?.memorySnapshot?.() || null,
                ...context.context
            }
        };

        this.reports.push(report);

        if (this.reports.length > this.maxReports) this.reports.shift();

        this._dispatch(report);

        return report;

    }

    list() {

        return [...this.reports];

    }

    clear() {

        this.reports = [];

    }

    /* ---------- sinks ---------- */

    addSink(sink) {

        this.sinks.push(sink);

    }

    _dispatch(report) {

        for (const sink of this.sinks) {

            try { sink(report); } catch {}

        }

        this.logger?.error?.("[CrashReporter]", report.message, report.source);

    }

    /* ---------- helpers ---------- */

    _normalizeError(error) {

        if (error instanceof Error) return error;

        if (typeof error === "string") return new Error(error);

        return new Error(JSON.stringify(error));

    }

    _captureFromWindow(event) {

        this.report(event.error || event.message, { source: "window:error" });

    }

    _captureFromPromise(event) {

        this.report(event.reason, { source: "window:unhandledrejection" });

    }

}