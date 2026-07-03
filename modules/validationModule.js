/**
 * Validation Module
 */

import { BaseViewModule } from "./baseViewModule.js";

export class ValidationModule extends BaseViewModule {

    constructor(ctx) {

        super("validation", ctx);

    }

    render(content, actions) {

        this.content = content;

        actions.innerHTML = `<button id="btn-revalidate" class="btn btn-primary">Kiểm tra lại</button>`;

        actions.querySelector("#btn-revalidate")
            .addEventListener("click", () => this.run());

        this.run();

    }

    run() {

        const slides = this.ctx.store.get("slides") || [];

        const report = this.ctx.services.validator.validate(slides);

        this.ctx.store.set("validation", report);

        this.status(`Validation: ${report.errors} lỗi, ${report.warnings} cảnh báo`);

        const scoreClass =
            report.score >= 80 ? "score-good" :
            report.score >= 50 ? "score-mid" : "score-bad";

        const issues = report.issues.map(issue => `
<div class="issue issue-${issue.level}" ${issue.slideIndex != null ? `data-slide="${issue.slideIndex}"` : ""}>
    <span class="issue-icon">${issue.level === "error" ? "✖" : "⚠"}</span>
    <span class="issue-text">${this.esc(issue.message)}</span>
    ${issue.slideIndex != null ? `<button class="btn btn-secondary btn-sm" data-goto="${issue.slideIndex}">Sửa</button>` : ""}
</div>`).join("");

        this.content.innerHTML = `
<div class="validation">
    <div class="validation-summary">
        <div class="score-ring ${scoreClass}">
            <div class="score-value">${report.score}</div>
            <div class="score-label">điểm</div>
        </div>
        <div class="validation-stats">
            <div>🖼 ${report.slideCount} slide</div>
            <div>✖ ${report.errors} lỗi</div>
            <div>⚠ ${report.warnings} cảnh báo</div>
            <div>${report.passed ? "✅ Đạt yêu cầu xuất file" : "❌ Cần sửa lỗi trước khi xuất"}</div>
        </div>
    </div>

    <h3 class="section-heading">Chi tiết (${report.issues.length})</h3>

    <div class="issue-list">
        ${issues || `<div class="issue issue-ok"><span class="issue-icon">✔</span><span class="issue-text">Không tìm thấy vấn đề nào. Bài trình bày sẵn sàng!</span></div>`}
    </div>

    <div class="planner-footer">
        <button id="btn-go-export" class="btn btn-primary" ${report.slideCount === 0 ? "disabled" : ""}>Xuất file →</button>
    </div>
</div>`;

        this.content.querySelectorAll("[data-goto]").forEach(btn => {

            btn.addEventListener("click", () => this.ctx.router.navigate("planner"));

        });

        this.content.querySelector("#btn-go-export")
            ?.addEventListener("click", () => this.ctx.router.navigate("export"));

    }

}
