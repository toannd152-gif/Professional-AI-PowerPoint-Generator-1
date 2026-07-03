/**
 * Dashboard Module
 * Pipeline overview + quick actions.
 */

import { BaseViewModule } from "./baseViewModule.js";

export class DashboardModule extends BaseViewModule {

    constructor(ctx) {

        super("dashboard", ctx);

    }

    render(content, actions) {

        const doc = this.ctx.store.get("document");
        const analysis = this.ctx.store.get("analysis");
        const slides = this.ctx.store.get("slides") || [];
        const validation = this.ctx.store.get("validation");

        const steps = [
            {
                route: "upload", icon: "📄", title: "1. Upload",
                done: !!doc,
                detail: doc ? `${doc.title} (${doc.pages.length} trang)` : "Import PDF / TXT / MD / HTML"
            },
            {
                route: "analysis", icon: "🔍", title: "2. AI Analysis",
                done: !!analysis,
                detail: analysis ? `${analysis.sections.length} phần, ${analysis.keywords.length} từ khóa` : "Phân tích cấu trúc & từ khóa"
            },
            {
                route: "planner", icon: "🗂", title: "3. Slide Planner",
                done: slides.length > 0,
                detail: slides.length ? `${slides.length} slide` : "Tạo & chỉnh sửa kế hoạch slide"
            },
            {
                route: "renderer", icon: "🖼", title: "4. Rendering",
                done: slides.length > 0,
                detail: "Xem trước slide với theme"
            },
            {
                route: "validation", icon: "✅", title: "5. Validation",
                done: validation?.passed,
                detail: validation ? `Điểm: ${validation.score}/100` : "Kiểm tra chất lượng"
            },
            {
                route: "export", icon: "📦", title: "6. Export",
                done: false,
                detail: "Xuất PPTX / HTML / JSON"
            }
        ];

        const cards = steps.map(step => `
<div class="dash-card ${step.done ? "done" : ""}" data-route="${step.route}">
    <div class="dash-card-icon">${step.icon}</div>
    <div class="dash-card-title">${step.title} ${step.done ? "✓" : ""}</div>
    <div class="dash-card-detail">${this.esc(step.detail)}</div>
</div>`).join("");

        content.innerHTML = `
<div class="dashboard">
    <div class="dash-hero">
        <h2>AI PowerPoint Generator</h2>
        <p>Biến tài liệu thành bài trình bày trong 6 bước.</p>
    </div>
    <div class="dash-grid">${cards}</div>
</div>`;

        content.querySelectorAll(".dash-card").forEach(card => {

            card.addEventListener("click", () => {

                this.ctx.router.navigate(card.dataset.route);

            });

        });

    }

}
