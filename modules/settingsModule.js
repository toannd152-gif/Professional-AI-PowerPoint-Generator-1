/**
 * Settings Module
 */

import { BaseViewModule } from "./baseViewModule.js";

export class SettingsModule extends BaseViewModule {

    constructor(ctx) {

        super("settings", ctx);

    }

    render(content, actions) {

        this.content = content;

        const config = this.ctx.services.config;

        const appTheme = config.get("ui.theme") || "light";
        const maxBullets = config.get("planner.maxBullets") ?? 5;
        const defaultFormat = config.get("export.defaultFormat") || "pptx";

        content.innerHTML = `
<div class="settings">

    <div class="settings-group">
        <h3 class="section-heading">Giao diện</h3>
        <div class="inspector-field">
            <label>Chế độ hiển thị</label>
            <select id="set-theme" class="select">
                <option value="light" ${appTheme === "light" ? "selected" : ""}>Sáng (Light)</option>
                <option value="dark" ${appTheme === "dark" ? "selected" : ""}>Tối (Dark)</option>
            </select>
        </div>
    </div>

    <div class="settings-group">
        <h3 class="section-heading">Slide Planner</h3>
        <div class="inspector-field">
            <label>Số gạch đầu dòng tối đa mỗi slide</label>
            <input id="set-bullets" type="number" min="2" max="8" value="${maxBullets}">
        </div>
    </div>

    <div class="settings-group">
        <h3 class="section-heading">Export</h3>
        <div class="inspector-field">
            <label>Định dạng mặc định</label>
            <select id="set-format" class="select">
                <option value="pptx" ${defaultFormat === "pptx" ? "selected" : ""}>PowerPoint (.pptx)</option>
                <option value="html" ${defaultFormat === "html" ? "selected" : ""}>HTML</option>
                <option value="json" ${defaultFormat === "json" ? "selected" : ""}>JSON</option>
            </select>
        </div>
    </div>

    <div class="settings-group">
        <h3 class="section-heading">Dữ liệu</h3>
        <div class="btn-group">
            <button id="set-save" class="btn btn-primary">Lưu cài đặt</button>
            <button id="set-reset" class="btn btn-secondary">Khôi phục mặc định</button>
            <button id="set-clear-project" class="btn btn-secondary">Xóa dự án đã lưu</button>
        </div>
    </div>

</div>`;

        content.querySelector("#set-save").addEventListener("click", () => {

            config.set("ui.theme", content.querySelector("#set-theme").value);
            config.set("planner.maxBullets", Number(content.querySelector("#set-bullets").value));
            config.set("export.defaultFormat", content.querySelector("#set-format").value);

            config.save();

            this.ctx.events.emit("ui:theme", config.get("ui.theme"));

            this.notify("success", "Đã lưu cài đặt");

        });

        content.querySelector("#set-theme").addEventListener("change", event => {

            this.ctx.events.emit("ui:theme", event.target.value);

        });

        content.querySelector("#set-reset").addEventListener("click", () => {

            config.reset();

            this.notify("info", "Đã khôi phục cài đặt mặc định (tải lại trang để áp dụng)");

        });

        content.querySelector("#set-clear-project").addEventListener("click", () => {

            try { localStorage.removeItem("app-project"); } catch {}

            this.notify("info", "Đã xóa dự án đã lưu");

        });

    }

}
