/**
 * Upload Module
 * Import + preview documents.
 */

import { BaseViewModule } from "./baseViewModule.js";

export class UploadModule extends BaseViewModule {

    constructor(ctx) {

        super("upload", ctx);

    }

    render(content, actions) {

        this.content = content;

        actions.innerHTML = `<button id="btn-import" class="btn btn-primary">Import Document</button>`;

        actions.querySelector("#btn-import")
            .addEventListener("click", () => this.openPicker());

        const doc = this.ctx.store.get("document");

        if (doc) {

            this.renderDocument(doc);

        } else {

            this.renderUpload();

        }

    }

    renderUpload() {

        this.content.innerHTML = `
<div class="upload-panel" id="upload-panel">
    <div class="upload-icon">📄</div>
    <h2>Import Document</h2>
    <p>Kéo thả hoặc chọn file: PDF, TXT, MD, HTML</p>
    <button id="btn-select-file" class="btn btn-primary">Select File</button>
    <input id="file-input" type="file" hidden accept=".pdf,.txt,.md,.markdown,.html,.htm">
</div>`;

        const input = this.content.querySelector("#file-input");

        this.content.querySelector("#btn-select-file")
            .addEventListener("click", () => input.click());

        input.addEventListener("change", event => {

            if (event.target.files.length) {

                this.importFile(event.target.files[0]);

                event.target.value = "";

            }

        });

        const panel = this.content.querySelector("#upload-panel");

        panel.addEventListener("dragover", e => {
            e.preventDefault();
            panel.classList.add("dragover");
        });

        panel.addEventListener("dragleave", () => {
            panel.classList.remove("dragover");
        });

        panel.addEventListener("drop", e => {

            e.preventDefault();

            panel.classList.remove("dragover");

            if (e.dataTransfer.files.length) {
                this.importFile(e.dataTransfer.files[0]);
            }

        });

    }

    openPicker() {

        const input = this.content.querySelector("#file-input");

        if (input) {

            input.click();

        } else {

            this.renderUpload();

            this.content.querySelector("#file-input").click();

        }

    }

    async importFile(file) {

        this.status(`Đang xử lý ${file.name}...`);

        this.content.innerHTML = `
<div class="upload-panel">
    <div class="upload-icon">⏳</div>
    <h2>Đang xử lý...</h2>
    <p>${this.esc(file.name)}</p>
</div>`;

        const doc = await this.ctx.services.documentManager.import(file);

        if (doc) {

            this.notify("success", `Đã import ${doc.pages.length} trang từ ${file.name}`);

            this.status("Tài liệu sẵn sàng");

            this.renderDocument(doc);

        } else {

            this.notify("error", "Không thể đọc file này");

            this.status("Import thất bại");

            this.renderError();

        }

    }

    renderError() {

        this.content.innerHTML = `
<div class="upload-panel">
    <div class="upload-icon">⚠️</div>
    <h2>Không thể đọc file</h2>
    <p>Định dạng hỗ trợ: PDF, TXT, MD, HTML</p>
    <button id="btn-retry" class="btn btn-primary">Thử lại</button>
</div>`;

        this.content.querySelector("#btn-retry")
            .addEventListener("click", () => this.renderUpload());

    }

    renderDocument(doc) {

        const meta = doc.metadata || {};
        const pages = doc.pages || [];

        const pagesHtml = pages.map((page, i) => {

            const number = page.pageNumber ?? (page.index != null ? page.index + 1 : i + 1);

            const text = page.text ?? page.content ?? page.markdown ?? "";

            return `
<div class="doc-page">
    <div class="doc-page-header">Trang ${number}</div>
    <div class="doc-page-body">${this.esc(text) || "<em>(trống)</em>"}</div>
</div>`;

        }).join("");

        this.content.innerHTML = `
<div class="doc-preview">
    <div class="doc-preview-header">
        <div>
            <h2>${this.esc(doc.title)}</h2>
            <p class="doc-meta">
                ${pages.length} trang
                ${meta.fileSize ? " · " + this.formatBytes(meta.fileSize) : ""}
            </p>
        </div>
        <div class="btn-group">
            <button id="btn-new-import" class="btn btn-secondary">Import file khác</button>
            <button id="btn-go-analysis" class="btn btn-primary">Phân tích →</button>
        </div>
    </div>
    <div class="doc-pages">${pagesHtml}</div>
</div>`;

        this.content.querySelector("#btn-new-import")
            .addEventListener("click", () => this.renderUpload());

        this.content.querySelector("#btn-go-analysis")
            .addEventListener("click", () => this.ctx.router.navigate("analysis"));

    }

    formatBytes(bytes) {

        if (!bytes) return "0 Bytes";

        const units = ["Bytes", "KB", "MB", "GB"];

        const i = Math.floor(Math.log(bytes) / Math.log(1024));

        return (bytes / Math.pow(1024, i)).toFixed(2) + " " + units[i];

    }

}
