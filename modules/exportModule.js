/**
 * Export Module
 * PPTX / HTML / JSON export.
 */

import { BaseViewModule } from "./baseViewModule.js";
import { getTheme, THEMES } from "../js/services/themes.js";
import { exportHTML, exportJSON, download } from "../js/services/exporters.js";

export class ExportModule extends BaseViewModule {

    constructor(ctx) {

        super("export", ctx);

    }

    render(content, actions) {

        this.content = content;

        const slides = this.ctx.store.get("slides") || [];

        if (!slides.length) {

            this.emptyState(content, {
                icon: "📦",
                title: "Chưa có slide để xuất",
                text: "Hãy tạo kế hoạch slide trước.",
                buttonLabel: "Đi tới Slide Planner",
                route: "planner"
            });

            return;

        }

        const project = this.ctx.store.get("project");

        const themeId = this.ctx.store.get("presentation.theme") || "ocean";

        const defaultName = (project?.name || "presentation")
            .replace(/[\\/:*?"<>|]/g, "_");

        const formats = [
            { id: "pptx", icon: "📊", title: "PowerPoint (.pptx)", text: "File PowerPoint chuẩn, mở được bằng PowerPoint / Google Slides / Keynote." },
            { id: "html", icon: "🌐", title: "HTML Slides (.html)", text: "Trang web trình chiếu độc lập, mở bằng trình duyệt." },
            { id: "json", icon: "🧾", title: "Dự án (.json)", text: "Toàn bộ dữ liệu dự án để lưu trữ hoặc chỉnh sửa sau." }
        ].map(f => `
<div class="export-card" data-format="${f.id}">
    <div class="export-icon">${f.icon}</div>
    <div class="export-info">
        <div class="export-title">${f.title}</div>
        <div class="export-text">${f.text}</div>
    </div>
    <button class="btn btn-primary" data-export="${f.id}">Tải xuống</button>
</div>`).join("");

        this.content.innerHTML = `
<div class="export">
    <div class="export-settings">
        <div class="inspector-field">
            <label>Tên file</label>
            <input id="export-name" type="text" value="${this.esc(defaultName)}">
        </div>
        <div class="inspector-field">
            <label>Theme</label>
            <select id="export-theme" class="select">
                ${THEMES.map(t => `<option value="${t.id}" ${t.id === themeId ? "selected" : ""}>${t.name}</option>`).join("")}
            </select>
        </div>
        <div class="doc-meta">${slides.length} slide sẽ được xuất</div>
    </div>
    <div class="export-list">${formats}</div>
</div>`;

        this.content.querySelector("#export-theme")
            .addEventListener("change", event => {
                this.ctx.store.set("presentation.theme", event.target.value);
            });

        this.content.querySelectorAll("[data-export]").forEach(btn => {

            btn.addEventListener("click", () => this.export(btn.dataset.export));

        });

    }

    export(format) {

        const slides = this.ctx.store.get("slides") || [];
        const project = this.ctx.store.get("project");
        const theme = getTheme(this.ctx.store.get("presentation.theme") || "ocean");

        const name = (this.content.querySelector("#export-name").value.trim() || "presentation");

        try {

            this.status(`Đang xuất ${format.toUpperCase()}...`);

            if (format === "pptx") {

                const bytes = this.ctx.services.pptx.build(slides, theme, {
                    title: project?.name || name,
                    author: "AI PPT Generator"
                });

                download(
                    new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" }),
                    `${name}.pptx`
                );

            } else if (format === "html") {

                download(exportHTML(slides, theme, project?.name || name), `${name}.html`);

            } else if (format === "json") {

                download(exportJSON({
                    project,
                    slides,
                    theme: theme.id,
                    analysis: this.ctx.store.get("analysis"),
                    exportedAt: new Date().toISOString()
                }), `${name}.json`);

            }

            this.notify("success", `Đã xuất ${name}.${format}`);

            this.status("Xuất file thành công");

        } catch (error) {

            this.ctx.logger.error(error);

            this.notify("error", "Xuất file thất bại: " + error.message);

        }

    }

}
