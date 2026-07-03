/**
 * DocumentModelBuilder
 *
 * Stage 2 of the parsing pipeline.
 *
 *     RawDocument  --(builder)-->  DocumentModel
 *
 * The builder is the ONLY place where the typed Domain
 * objects are constructed from a parser output. All other
 * services (analyzer, planner, renderer) consume the typed
 * DocumentModel — they never look at parser-specific fields
 * again.
 *
 * Keeping this conversion in a single, well-tested class
 * means we can swap or add parsers (DOCX, EPUB, RTF...)
 * without touching any downstream code.
 */

import {
    RawDocument,
    DocumentModel,
    Document,
    Section,
    Paragraph,
    Image,
    Table
} from "../../models/index.js";

export class DocumentModelBuilder {

    constructor(options = {}) {

        this.headingDetector = options.headingDetector || this._defaultHeadingDetector;
        this.splitOnBlankLine = options.splitOnBlankLine ?? true;

    }

    /**
     * Public entry point.
     */
    build(raw) {

        if (raw instanceof DocumentModel) return raw;

        if (!(raw instanceof RawDocument) && raw?.pages) {

            raw = this._wrap(raw);

        }

        const document = new Document({
            title: this._cleanTitle(raw.title),
            source: raw.format || raw.metadata?.type || "unknown",
            language: raw.metadata?.language || "vi",
            metadata: { ...raw.metadata, rawId: raw.id }
        });

        const structure = this._extractStructure(raw);
        const sections = this._splitIntoSections(raw);

        for (const sec of sections) {

            const section = new Section({
                id: sec.id,
                title: sec.title,
                level: sec.level,
                order: sec.order,
                metadata: sec.metadata
            });

            for (const p of sec.paragraphs) {

                section.addParagraph(
                    new Paragraph({
                        id: p.id,
                        text: p.text,
                        type: p.type,
                        order: p.order
                    })
                );

            }

            for (const img of sec.images || []) {

                section.addImage(
                    new Image({
                        id: img.id,
                        src: img.src,
                        mimeType: img.mimeType,
                        width: img.width,
                        height: img.height,
                        alt: img.alt,
                        caption: img.caption,
                        source: "document"
                    })
                );

            }

            for (const tbl of sec.tables || []) {

                section.addTable(
                    new Table({
                        id: tbl.id,
                        headers: tbl.headers || [],
                        rows: tbl.rows || [],
                        caption: tbl.caption || ""
                    })
                );

            }

            document.addSection(section);

        }

        for (const img of raw.collectImages()) {

            document.addImage(new Image({
                src: img.src,
                mimeType: img.mimeType,
                width: img.width,
                height: img.height,
                alt: img.alt,
                caption: img.caption,
                source: img.source || "document"
            }));

        }

        for (const tbl of raw.collectTables()) {

            document.addTable(new Table({
                headers: tbl.headers || [],
                rows: tbl.rows || [],
                caption: tbl.caption || ""
            }));

        }

        const stats = this._computeStats(document);

        return new DocumentModel({
            document,
            structure,
            stats,
            metadata: { rawId: raw.id, format: raw.format }
        });

    }

    /* ------------------------------------------------------------------ */

    _wrap(plain) {

        return new RawDocument({
            title: plain.title || "Untitled",
            format: plain.metadata?.type || "unknown",
            pages: plain.pages || [],
            metadata: plain.metadata || {}
        });

    }

    _cleanTitle(title) {

        return String(title || "Untitled")
            .replace(/\.(pdf|txt|md|html?|markdown)$/i, "")
            .trim() || "Untitled";

    }

    /**
     * Walk all pages and turn them into Sections.
     */
    _splitIntoSections(raw) {

        const lines = [];

        for (const page of raw.pages) {

            const text = page.text ?? page.markdown ?? "";

            const pageNumber = page.pageNumber ?? (lines.length + 1);

            for (const raw_line of text.split(/\r?\n/)) {

                lines.push({ line: raw_line, pageNumber });

            }

        }

        const sections = [];
        let current = null;
        let counter = 0;

        const flush = () => {

            if (!current) return;

            current.text = current.lines.join("\n").trim();

            sections.push({
                id: `section-${counter++}`,
                title: current.title,
                level: current.level,
                order: sections.length,
                paragraphs: this._linesToParagraphs(current.lines, current.title || "(không tiêu đề)"),
                images: [],
                tables: []
            });

            current = null;

        };

        for (const { line, pageNumber } of lines) {

            const trimmed = line.trim();

            if (!trimmed) {

                if (current && this.splitOnBlankLine) {

                    current.lines.push("");

                }

                continue;

            }

            const heading = this.headingDetector(trimmed);

            if (heading) {

                flush();

                current = {
                    title: heading.title,
                    level: heading.level,
                    lines: [],
                    pageNumber
                };

            } else {

                if (!current) {

                    current = {
                        title: "",
                        level: 1,
                        lines: [],
                        pageNumber
                    };

                }

                current.lines.push(trimmed);

            }

        }

        flush();

        if (sections.length === 0 && raw.pages.length > 0) {

            sections.push({
                id: `section-${counter}`,
                title: raw.pages.length > 1 ? "Tài liệu" : "",
                level: 1,
                order: 0,
                paragraphs: this._linesToParagraphs(
                    raw.fullText().split(/\r?\n/),
                    "Tài liệu"
                ),
                images: [],
                tables: []
            });

        }

        return sections;

    }

    _linesToParagraphs(lines, fallbackTitle) {

        const chunks = [];
        let current = [];

        for (const line of lines) {

            if (!line.trim()) {

                if (current.length) {

                    chunks.push(current.join(" "));

                    current = [];

                }

            } else {

                current.push(line);

            }

        }

        if (current.length) chunks.push(current.join(" "));

        if (chunks.length === 0 && fallbackTitle) {

            chunks.push(fallbackTitle);

        }

        return chunks.map((text, i) => ({
            id: `para-${i}`,
            text,
            type: "text",
            order: i
        }));

    }

    _extractStructure(raw) {

        const headings = [];

        let inCodeBlock = false;

        for (const page of raw.pages) {

            const text = page.text ?? page.markdown ?? "";

            for (const raw_line of text.split(/\r?\n/)) {

                const line = raw_line.trim();

                if (/^```/.test(line)) {

                    inCodeBlock = !inCodeBlock;

                    continue;

                }

                if (inCodeBlock) continue;

                const m = line.match(/^(#{1,6})\s+(.+)$/);

                if (m) {

                    headings.push({
                        level: m[1].length,
                        text: m[2].trim()
                    });

                    continue;

                }

                if (/^(chương|phần|mục|bài|chapter|section|part)\s+[\divxlc]+/i.test(line)
                    && line.length <= 90) {

                    headings.push({ level: 1, text: line });

                }

            }

        }

        return { headings, outline: headings.map((h, i) => ({ ...h, index: i })) };

    }

    _computeStats(document) {

        let words = 0;
        let sentences = 0;
        let characters = 0;

        for (const sec of document.sections) {

            for (const p of sec.paragraphs) {

                const text = p.text || "";

                characters += text.length;

                const ws = text.split(/\s+/).filter(Boolean);

                words += ws.length;

                sentences += p.sentenceCount?.() ?? text.split(/[.!?…]+/).filter(s => s.trim()).length;

            }

        }

        return {
            pages: document.sections.length,
            sections: document.sectionCount,
            words,
            sentences,
            characters,
            readingMinutes: Math.max(1, Math.round(words / 200))
        };

    }

    /**
     * Default heading detector — same heuristic the original
     * analyzer used, kept here so that the parser side is
     * the single source of truth for "what is a heading".
     */
    _defaultHeadingDetector(line) {

        if (line.length > 90) return null;

        const hash = line.match(/^(#{1,6})\s+(.+)$/);

        if (hash) return { level: hash[1].length, title: hash[2].trim() };

        if (/[.!?;:,]$/.test(line)) return null;

        if (/^(chương|phần|mục|bài|chapter|section|part)\s+[\divxlc]+/i.test(line)) {

            return { level: 1, title: line };

        }

        if (/^([IVXLC]+|\d+(\.\d+)*)[.)]\s+\S/.test(line)) {

            return { level: 1, title: line };

        }

        const letters = line.replace(/[^A-Za-zÀ-ỹ]/g, "");

        if (letters.length >= 4) {

            const upper = letters.replace(/[^A-ZÀ-Ỹ]/g, "").length;

            if (upper / letters.length > 0.8) {

                return { level: 1, title: line };

            }

        }

        return null;

    }

}