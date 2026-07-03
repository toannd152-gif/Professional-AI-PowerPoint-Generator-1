/**
 * AI Analysis Module
 */

import { BaseViewModule } from "./baseViewModule.js";

export class AnalysisModule extends BaseViewModule {

    constructor(ctx) {

        super("analysis", ctx);

    }

    render(content, actions) {

        this.content = content;

        const doc = this.ctx.store.get("document");

        if (!doc) {

            this.emptyState(content, {
                icon: "🔍",
                title: "Chưa có tài liệu",
                text: "Hãy import tài liệu trước khi phân tích.",
                buttonLabel: "Đi tới Upload",
                route: "upload"
            });

            return;

        }

        actions.innerHTML = `<button id="btn-analyze" class="btn btn-primary">Phân tích lại</button>`;

        actions.querySelector("#btn-analyze")
            .addEventListener("click", () => this.runAnalysis(doc));

        const analysis = this.ctx.store.get("analysis");

        if (analysis) {

            this.renderResult(analysis);

        } else {

            this.runAnalysis(doc);

        }

    }

    runAnalysis(doc) {

        this.status("Đang phân tích tài liệu...");

        this.content.innerHTML = `
<div class="upload-panel">
    <div class="upload-icon">🔍</div>
    <h2>Đang phân tích...</h2>
</div>`;

        /*
        setTimeout keeps UI responsive on big documents.
        */
        setTimeout(() => {

            const analysis = this.ctx.services.analyzer.analyze(doc);

            this.ctx.store.set("analysis", analysis);

            this.notify("success", `Phân tích xong: ${analysis.sections.length} phần, ${analysis.keywords.length} từ khóa`);

            this.status("Phân tích hoàn tất");

            this.renderResult(analysis);

        }, 50);

    }

    renderResult(analysis) {

        const stats = analysis.stats;

        const statCards = [
            { label: "Trang", value: stats.pages },
            { label: "Phần", value: stats.sections },
            { label: "Từ", value: stats.words.toLocaleString("vi-VN") },
            { label: "Phút đọc", value: "~" + stats.readingMinutes }
        ].map(s => `
<div class="stat-card">
    <div class="stat-value">${s.value}</div>
    <div class="stat-label">${s.label}</div>
</div>`).join("");

        const keywords = analysis.keywords.map(k =>
            `<span class="keyword-chip">${this.esc(k.word)} <b>${k.count}</b></span>`
        ).join("");

        const sections = analysis.sections.map((s, i) => `
<div class="doc-page">
    <div class="doc-page-header">Phần ${i + 1}: ${this.esc(s.title || "(không tiêu đề)")}</div>
    <div class="doc-page-body">${this.esc(s.content.slice(0, 400))}${s.content.length > 400 ? "…" : ""}</div>
</div>`).join("");

        this.content.innerHTML = `
<div class="doc-preview">
    <div class="doc-preview-header">
        <div>
            <h2>${this.esc(analysis.title)}</h2>
            <p class="doc-meta">Phân tích lúc ${new Date(analysis.analyzedAt).toLocaleTimeString("vi-VN")}</p>
        </div>
        <button id="btn-go-planner" class="btn btn-primary">Tạo kế hoạch slide →</button>
    </div>

    <div class="stat-grid">${statCards}</div>

    <h3 class="section-heading">Từ khóa chính</h3>
    <div class="keyword-list">${keywords || "<em>Không tìm thấy</em>"}</div>

    <h3 class="section-heading">Cấu trúc tài liệu (${analysis.sections.length} phần)</h3>
    <div class="doc-pages">${sections}</div>
</div>`;

        this.content.querySelector("#btn-go-planner")
            .addEventListener("click", () => this.ctx.router.navigate("planner"));

    }

}
