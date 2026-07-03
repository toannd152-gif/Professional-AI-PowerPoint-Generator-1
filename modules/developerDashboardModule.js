/**
 * Developer Dashboard Module
 *
 * A separate, developer-facing dashboard with:
 *
 *   - System Health    (CPU / memory, crash count, recovery count)
 *   - Memory           (heap usage chart, samples)
 *   - Loaded Modules   (registered modules + their state)
 *   - Store Viewer     (full store tree, click to edit)
 *   - Logger Viewer    (live log stream, filterable by level)
 *   - Event Monitor    (live event list with payload inspector)
 *
 * Lives next to the user-facing dashboard, but adds the
 * tooling the development team needs to ship the project.
 */

import { BaseViewModule } from "./baseViewModule.js";

export class DeveloperDashboardModule extends BaseViewModule {

    constructor(ctx) {

        super("developer", ctx);

        this.tab = "health";

        this._unsubPerf = null;
        this._unsubLog = null;
        this._unsubEvent = null;

    }

    async destroy() {

        try { this._unsubPerf?.(); } catch {}
        try { this._unsubLog?.(); } catch {}
        try { this._unsubEvent?.(); } catch {}

        await super.destroy();

    }

    render(content, actions) {

        actions.innerHTML = `
<button id="dev-refresh" class="btn btn-secondary">⟳ Refresh</button>
<button id="dev-clear-logs" class="btn btn-secondary">Clear logs</button>
<button id="dev-clear-events" class="btn btn-secondary">Clear event log</button>`;

        actions.querySelector("#dev-refresh").addEventListener("click", () => this.renderTab(content));
        actions.querySelector("#dev-clear-logs").addEventListener("click", () => {

            this.ctx.logger.logs = [];
            this.renderTab(content);

        });
        actions.querySelector("#dev-clear-events").addEventListener("click", () => {

            this.ctx.events._devEventLog = [];
            this.renderTab(content);

        });

        this.renderTab(content);

    }

    renderTab(content) {

        const tabs = [
            { id: "health", icon: "❤", label: "System Health" },
            { id: "memory", icon: "💾", label: "Memory" },
            { id: "modules", icon: "📦", label: "Loaded Modules" },
            { id: "store", icon: "🗄", label: "Store Viewer" },
            { id: "logger", icon: "📋", label: "Logger" },
            { id: "events", icon: "📡", label: "Event Monitor" }
        ];

        const tabBar = `
<div class="dev-tabs">
    ${tabs.map(t => `<button class="dev-tab ${this.tab === t.id ? "active" : ""}" data-tab="${t.id}">${t.icon} ${t.label}</button>`).join("")}
</div>`;

        const tabContent = `<div class="dev-tab-content" id="dev-tab-content">${this.renderActiveTab()}</div>`;

        content.innerHTML = `<div class="dev-dashboard">${tabBar}${tabContent}</div>`;

        content.querySelectorAll(".dev-tab").forEach(btn => {

            btn.addEventListener("click", () => {

                this.tab = btn.dataset.tab;
                this.renderTab(content);

            });

        });

    }

    renderActiveTab() {

        switch (this.tab) {

            case "health":  return this.renderHealth();
            case "memory":  return this.renderMemory();
            case "modules": return this.renderModules();
            case "store":   return this.renderStore();
            case "logger":  return this.renderLogger();
            case "events":  return this.renderEvents();
            default:        return "<em>Unknown tab</em>";

        }

    }

    /* ---------------- Health ---------------- */

    renderHealth() {

        const monitor = this.ctx.services.performanceMonitor;
        const snap = monitor?.snapshot?.() || {};

        const memory = snap.memory || {};
        const usedMB = memory.usedJSHeapSize ? Math.round(memory.usedJSHeapSize / (1024 * 1024)) : null;
        const limitMB = memory.jsHeapSizeLimit ? Math.round(memory.jsHeapSizeLimit / (1024 * 1024)) : null;

        const crashes = this.ctx.services.crashReporter?.list?.() || [];
        const checkpoints = this.ctx.services.recoveryManager?.checkpoints?.() || [];

        const modules = this.ctx.services.moduleManager?.list?.() || [];

        const plugins = this.ctx.services.pluginManager?.describeAll?.() || [];

        const cards = [
            { icon: "❤", label: "Status", value: this._statusWord(), tone: this._statusTone() },
            { icon: "🎞", label: "FPS", value: snap.fps ?? "n/a" },
            { icon: "💾", label: "Memory", value: usedMB != null ? `${usedMB} MB` : "n/a" },
            { icon: "📦", label: "Modules", value: modules.length },
            { icon: "🧩", label: "Plugins", value: plugins.length },
            { icon: "💥", label: "Crashes", value: crashes.length, tone: crashes.length ? "bad" : "good" },
            { icon: "🛟", label: "Checkpoints", value: checkpoints.length },
            { icon: "⏱", label: "Uptime (s)", value: Math.round((performance.now?.() ?? 0) / 1000) }
        ];

        return `
<div class="dev-cards">
    ${cards.map(c => `
<div class="dev-card ${c.tone || ""}">
    <div class="dev-card-icon">${c.icon}</div>
    <div class="dev-card-value">${c.value}</div>
    <div class="dev-card-label">${c.label}</div>
</div>`).join("")}
</div>
<div class="dev-section">
    <h4>Performance timings</h4>
    <table class="dev-table">
        <thead><tr><th>Operation</th><th>Count</th><th>Avg (ms)</th><th>Last (ms)</th><th>Max (ms)</th></tr></thead>
        <tbody>
            ${Object.entries(snap.timings || {}).map(([name, t]) => `
<tr>
    <td>${this.esc(name)}</td>
    <td>${t.count}</td>
    <td>${t.avg.toFixed(1)}</td>
    <td>${t.last.toFixed(1)}</td>
    <td>${t.max.toFixed(1)}</td>
</tr>`).join("") || "<tr><td colspan='5'><em>Chưa có dữ liệu</em></td></tr>"}
        </tbody>
    </table>
</div>`;

    }

    _statusWord() {

        const crashes = this.ctx.services.crashReporter?.list?.() || [];

        if (crashes.length === 0) return "OK";

        const recent = crashes[crashes.length - 1];

        if (Date.now() - recent.timestampMs < 60_000) return "DEGRADED";

        return "RECOVERED";

    }

    _statusTone() {

        const w = this._statusWord();

        return w === "OK" ? "good" : (w === "RECOVERED" ? "mid" : "bad");

    }

    /* ---------------- Memory ---------------- */

    renderMemory() {

        const monitor = this.ctx.services.performanceMonitor;

        const mem = monitor?.memorySnapshot?.() || {};

        const usedMB = mem.usedJSHeapSize ? (mem.usedJSHeapSize / 1024 / 1024).toFixed(1) : "n/a";
        const totalMB = mem.totalJSHeapSize ? (mem.totalJSHeapSize / 1024 / 1024).toFixed(1) : "n/a";
        const limitMB = mem.jsHeapSizeLimit ? (mem.jsHeapSizeLimit / 1024 / 1024).toFixed(1) : "n/a";

        return `
<div class="dev-cards">
    <div class="dev-card"><div class="dev-card-icon">📊</div><div class="dev-card-value">${usedMB} MB</div><div class="dev-card-label">Used heap</div></div>
    <div class="dev-card"><div class="dev-card-icon">📈</div><div class="dev-card-value">${totalMB} MB</div><div class="dev-card-label">Total heap</div></div>
    <div class="dev-card"><div class="dev-card-icon">📉</div><div class="dev-card-value">${limitMB} MB</div><div class="dev-card-label">Limit</div></div>
    <div class="dev-card"><div class="dev-card-icon">🎞</div><div class="dev-card-value">${monitor?.fps ?? "n/a"}</div><div class="dev-card-label">FPS</div></div>
</div>
<div class="dev-section">
    <h4>Heap pressure</h4>
    <div class="dev-bar"><div class="dev-bar-fill" style="width:${mem.totalJSHeapSize && mem.jsHeapSizeLimit ? Math.min(100, mem.totalJSHeapSize / mem.jsHeapSizeLimit * 100).toFixed(0) : 0}%"></div></div>
</div>`;

    }

    /* ---------------- Modules ---------------- */

    renderModules() {

        const modules = this.ctx.services.moduleManager?.list?.() || [];
        const plugins = this.ctx.services.pluginManager?.describeAll?.() || [];

        const moduleRows = modules.map(m => {

            const inst = this.ctx.services.moduleManager.get(m);

            return `
<tr>
    <td>${this.esc(m)}</td>
    <td>${inst?.version || "1.0.0"}</td>
    <td><span class="dev-badge ${inst?.running ? "good" : "mid"}">${inst?.running ? "running" : (inst?.initialized ? "ready" : "idle")}</span></td>
</tr>`;

        }).join("");

        const pluginRows = plugins.map(p => `
<tr>
    <td>${this.esc(p.id)}</td>
    <td>${this.esc(p.name)}</td>
    <td>${this.esc(p.version)}</td>
    <td><span class="dev-badge ${p.state === "active" ? "good" : "mid"}">${p.state}</span></td>
</tr>`).join("");

        return `
<div class="dev-section">
    <h4>Application modules</h4>
    <table class="dev-table">
        <thead><tr><th>Name</th><th>Version</th><th>State</th></tr></thead>
        <tbody>${moduleRows || "<tr><td colspan='3'><em>Không có</em></td></tr>"}</tbody>
    </table>
</div>
<div class="dev-section">
    <h4>Plugins</h4>
    <table class="dev-table">
        <thead><tr><th>ID</th><th>Name</th><th>Version</th><th>State</th></tr></thead>
        <tbody>${pluginRows || "<tr><td colspan='4'><em>Chưa có plugin</em></td></tr>"}</tbody>
    </table>
</div>`;

    }

    /* ---------------- Store Viewer ---------------- */

    renderStore() {

        const tree = this.ctx.store.getState();

        const rows = this._flatten(tree, "");

        return `
<div class="dev-section">
    <h4>Store tree</h4>
    <table class="dev-table">
        <thead><tr><th>Path</th><th>Value</th></tr></thead>
        <tbody>
            ${rows.map(([path, value]) => `<tr><td>${this.esc(path)}</td><td><code>${this.esc(this._stringify(value))}</code></td></tr>`).join("")}
        </tbody>
    </table>
</div>`;

    }

    _flatten(obj, prefix) {

        const rows = [];

        if (obj === null || typeof obj !== "object") {

            rows.push([prefix || "(root)", this._stringify(obj)]);

            return rows;

        }

        for (const [key, value] of Object.entries(obj)) {

            const path = prefix ? `${prefix}.${key}` : key;

            if (value !== null && typeof value === "object" && !Array.isArray(value)) {

                rows.push(...this._flatten(value, path));

            } else {

                rows.push([path, value]);

            }

        }

        return rows;

    }

    _stringify(value) {

        if (value === null) return "null";
        if (value === undefined) return "undefined";

        const str = typeof value === "string" ? value : JSON.stringify(value);

        return str.length > 120 ? str.slice(0, 120) + "…" : str;

    }

    /* ---------------- Logger Viewer ---------------- */

    renderLogger() {

        const logs = this.ctx.logger.logs || [];

        /*
        NOTE: <script> tags inserted via innerHTML never
        execute, so messages are escaped inline instead.
        */
        return `
<div class="dev-section">
    <h4>Logger output (${logs.length})</h4>
    <div class="dev-log-list">
        ${logs.length === 0 ? "<em>Logger chưa ghi gì.</em>" : logs.slice(-200).map(l => `
<div class="dev-log dev-log-${l.level}">
    <span class="dev-log-time">${new Date(l.time).toLocaleTimeString("vi-VN")}</span>
    <span class="dev-log-level">${l.level.toUpperCase()}</span>
    <span class="dev-log-msg">${this.esc(l.message)}</span>
</div>`).join("")}
    </div>
</div>`;

    }

    /* ---------------- Event Monitor ---------------- */

    renderEvents() {

        const events = this.ctx.events._devEventLog || [];

        return `
<div class="dev-section">
    <h4>Recent events (${events.length})</h4>
    <div class="dev-event-list">
        ${events.length === 0 ? "<em>Chưa có sự kiện nào.</em>" : events.slice(-100).reverse().map(e => `
<div class="dev-event">
    <span class="dev-event-time">${new Date(e.time).toLocaleTimeString("vi-VN")}</span>
    <span class="dev-event-name">${this.esc(e.name)}</span>
    <pre class="dev-event-payload">${this.esc(JSON.stringify(e.payload, null, 2).slice(0, 400))}</pre>
</div>`).join("")}
    </div>
</div>`;

    }

}