/**
 * RawDocument
 *
 * Stage 1 of the parsing pipeline: a thin, format-agnostic
 * container produced directly by any Parser implementation.
 *
 * It carries pages with whatever raw fields each parser
 * supplies (`text`, `html`, `markdown`, `images`, `tables`,
 * `pageNumber`...).
 *
 * Downstream code (DocumentModelBuilder) is responsible for
 * converting a RawDocument into a fully-typed Document.
 */

import { BaseModel } from "./BaseModel.js";

export class RawDocument extends BaseModel {

    constructor({
        id,
        title = "Untitled",
        format = "unknown",        // "pdf" | "txt" | "md" | "html"
        pages = [],
        metadata = {}
    } = {}) {

        super(id);

        this.title = title;
        this.format = format;
        this.pages = pages;          // [{ pageNumber, text, html?, markdown?, images?, tables? }]
        this.metadata = metadata;

    }

    get pageCount() {

        return this.pages.length;

    }

    /**
     * Concatenate raw text from every page.
     * Returns a single string the downstream DocumentModel
     * can split into Sections / Paragraphs.
     */
    fullText() {

        return this.pages
            .map(p => p.text ?? p.markdown ?? "")
            .join("\n\n");

    }

    collectImages() {

        const all = [];

        for (const page of this.pages) {

            if (Array.isArray(page.images)) {

                all.push(...page.images);

            }

        }

        return all;

    }

    collectTables() {

        const all = [];

        for (const page of this.pages) {

            if (Array.isArray(page.tables)) {

                all.push(...page.tables);

            }

        }

        return all;

    }

    /**
     * Build a deterministic, JSON-safe snapshot for persistence,
     * crash reports, or recovery.
     */
    snapshot() {

        return {
            id: this.id,
            title: this.title,
            format: this.format,
            pageCount: this.pageCount,
            pages: this.pages.map(p => ({
                pageNumber: p.pageNumber,
                text: p.text,
                html: p.html,
                markdown: p.markdown,
                imageCount: (p.images || []).length,
                tableCount: (p.tables || []).length
            })),
            metadata: this.metadata
        };

    }

    /* ---------- Persistence ---------- */

    toJSON() {

        return this.snapshot();

    }

    static fromJSON(data = {}) {

        return new RawDocument({

            id: data.id,
            title: data.title || "Untitled",
            format: data.format || "unknown",
            pages: Array.isArray(data.pages) ? data.pages.map(p => ({ ...p })) : [],
            metadata: data.metadata || {}

        });

    }

    /* ---------- Validation ---------- */

    validate() {

        return Array.isArray(this.pages) && this.pages.length >= 0;

    }

}