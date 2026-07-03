/**
 * Rendering Module
 * 16:9 slide previews with theme selection.
 */

import { BaseViewModule } from "./baseViewModule.js";
import { THEMES, getTheme } from "../js/services/themes.js";

export class RendererModule extends BaseViewModule {

    constructor(ctx) {

        super("renderer", ctx);

        this.index = 0;

    }

    render(content, actions) {

        this.content = content;

        const slides = this.ctx.store.get("slides") || [];

        if (!slides.length) {

            this.emptyState(content, {
                icon: "🖼",
                title: "Chưa có slide",
                text: "Hãy tạo kế hoạch slide trước khi xem trước.",
                buttonLabel: "Đi tới Slide Planner",
                route: "planner"
            });

            return;

        }

        const themeId = this.ctx.store.get("presentation.theme") || "ocean";

        actions.innerHTML = `
<select id="theme-select" class="select">
    ${THEMES.map(t => `<option value="${t.id}" ${t.id === themeId ? "selected" : ""}>${t.name}</option>`).join("")}
</select>`;

        actions.querySelector("#theme-select")
            .addEventListener("change", event => {

                this.ctx.store.set("presentation.theme", event.target.value);

                this.renderStage();

            });

        this.index = Math.min(this.index, slides.length - 1);

        this.renderStage();

    }

    renderStage() {

        const slides = this.ctx.store.get("slides") || [];

        const theme = getTheme(this.ctx.store.get("presentation.theme") || "ocean");

        const slide = slides[this.index];

        const thumbs = slides.map((s, i) => `
<div class="thumb ${i === this.index ? "active" : ""}" data-index="${i}"
     style="background:${s.type === "title" ? theme.titleBackground : theme.background}">
    <div class="thumb-bar" style="background:${theme.accent}"></div>
    <div class="thumb-title" style="color:${theme.title}">${this.esc(s.title)}</div>
    <div class="thumb-num">${i + 1}</div>
</div>`).join("");

        this.content.innerHTML = `
<div class="renderer">
    <div class="stage-wrap">
        <div class="stage" style="background:${slide.type === "title" ? theme.titleBackground : theme.background}">
            <div class="stage-inner">
                <div class="stage-bar" style="background:${theme.accent}"></div>
                <div class="stage-title" style="color:${theme.title}; font-family:${theme.fontHead}">${this.esc(slide.title)}</div>
                ${slide.subtitle ? `<div class="stage-subtitle" style="color:${theme.text}">${this.esc(slide.subtitle)}</div>` : ""}
                <ul class="stage-bullets" style="color:${theme.text}; font-family:${theme.fontBody}">
                    ${(slide.bullets || []).map(b => `<li><span style="color:${theme.accent}">•</span> ${this.esc(b)}</li>`).join("")}
                </ul>
                <div class="stage-num" style="color:${theme.text}">${this.index + 1} / ${slides.length}</div>
            </div>
        </div>
        <div class="stage-nav">
            <button class="btn btn-secondary" id="btn-prev" ${this.index === 0 ? "disabled" : ""}>← Trước</button>
            <span class="stage-counter">Slide ${this.index + 1} / ${slides.length}</span>
            <button class="btn btn-secondary" id="btn-next" ${this.index === slides.length - 1 ? "disabled" : ""}>Sau →</button>
        </div>
    </div>
    <div class="thumbs">${thumbs}</div>
</div>`;

        this.ctx.events.emit("slide:selected", slide.id);

        this.content.querySelector("#btn-prev")
            ?.addEventListener("click", () => { this.index--; this.renderStage(); });

        this.content.querySelector("#btn-next")
            ?.addEventListener("click", () => { this.index++; this.renderStage(); });

        this.content.querySelectorAll(".thumb").forEach(thumb => {

            thumb.addEventListener("click", () => {

                this.index = Number(thumb.dataset.index);

                this.renderStage();

            });

        });

    }

}
