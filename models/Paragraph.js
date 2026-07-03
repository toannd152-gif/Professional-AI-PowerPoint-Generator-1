/**
 * Paragraph
 *
 * Smallest text unit of the Domain Layer (yêu cầu #3).
 * A Section owns an ordered list of Paragraphs; every
 * downstream consumer (KnowledgeBuilder, PresentationBuilder,
 * Analyzer) reads text through this class instead of raw
 * parser output.
 *
 * Types:
 *   "text"     — normal body text
 *   "heading"  — heading captured inline (rare)
 *   "quote"    — block quote
 *   "list"     — list item
 *   "code"     — code / preformatted
 *   "caption"  — figure / table caption
 */

import { BaseModel } from "./BaseModel.js";

export const PARAGRAPH_TYPES = Object.freeze([
    "text", "heading", "quote", "list", "code", "caption"
]);

export class Paragraph extends BaseModel {

    /**
     * Accepts either an options object or a plain string:
     *
     *     new Paragraph("Xin chào")
     *     new Paragraph({ text: "Xin chào", type: "text", order: 0 })
     */
    constructor(input = {}) {

        const opts = typeof input === "string" ? { text: input } : (input || {});

        super(opts.id);

        this.text = opts.text ?? "";
        this.type = PARAGRAPH_TYPES.includes(opts.type) ? opts.type : "text";
        this.order = opts.order ?? 0;

        /* Optional provenance: which page of the RawDocument */
        this.pageNumber = opts.pageNumber ?? null;

        this.metadata = opts.metadata || {};

    }

    /* ---------- Queries ---------- */

    isEmpty() {

        return this.text.trim().length === 0;

    }

    wordCount() {

        return this.text.split(/\s+/).filter(Boolean).length;

    }

    sentenceCount() {

        return this.text.split(/[.!?…]+/).map(s => s.trim()).filter(Boolean).length;

    }

    charCount() {

        return this.text.length;

    }

    /**
     * First N sentences — used by builders to make bullets.
     */
    firstSentences(n = 1) {

        const parts = this.text
            .split(/(?<=[.!?…])\s+/)
            .map(s => s.trim())
            .filter(Boolean);

        return parts.slice(0, n);

    }

    plainText() {

        return this.text;

    }

    /* ---------- Mutators ---------- */

    setText(text) {

        this.text = String(text ?? "");

        this.touch();

    }

    append(text, separator = " ") {

        this.text = this.text ? `${this.text}${separator}${text}` : String(text ?? "");

        this.touch();

    }

    /* ---------- Persistence ---------- */

    toJSON() {

        return {
            id: this.id,
            text: this.text,
            type: this.type,
            order: this.order,
            pageNumber: this.pageNumber,
            wordCount: this.wordCount(),
            metadata: this.metadata,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };

    }

    static fromJSON(data = {}) {

        return new Paragraph({
            id: data.id,
            text: data.text,
            type: data.type,
            order: data.order,
            pageNumber: data.pageNumber,
            metadata: data.metadata || {}
        });

    }

    /* ---------- Validation ---------- */

    validate() {

        return typeof this.text === "string"
            && PARAGRAPH_TYPES.includes(this.type);

    }

}
