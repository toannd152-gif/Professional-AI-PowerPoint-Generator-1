/**
 * Document
 * High-level domain entity — represents a parsed source file
 * (PDF / TXT / MD / HTML) once it has been mapped into the
 * Domain Layer.
 *
 * This is the object that all downstream services (analyzer,
 * planner, renderer) operate on. It is independent of any
 * specific parser implementation.
 */

import { BaseModel } from "./BaseModel.js";
import { Section } from "./Section.js";
import { Paragraph } from "./Paragraph.js";
import { Image } from "./Image.js";
import { Table } from "./Table.js";

export class Document extends BaseModel {

    constructor({
        id,
        title = "Untitled",
        source = null,         // "pdf" | "txt" | "md" | "html" | "docx"
        language = "vi",
        sections = [],
        images = [],
        tables = [],
        metadata = {}
    } = {}) {

        super(id);

        this.title = title;
        this.source = source;
        this.language = language;

        this.sections = sections;
        this.images = images;
        this.tables = tables;

        this.metadata = metadata;

    }

    /* ---------- Sections ---------- */

    addSection(sectionLike) {

        const sec = sectionLike instanceof Section
            ? sectionLike
            : new Section(sectionLike);

        this.sections.push(sec);

        this.touch();

        return sec;

    }

    get sectionCount() {

        return this.sections.length;

    }

    /* ---------- Paragraphs (flat) ---------- */

    get paragraphs() {

        return this.sections.flatMap(s => s.paragraphs || []);

    }

    addParagraph(paragraphLike) {

        const para = paragraphLike instanceof Paragraph
            ? paragraphLike
            : new Paragraph(paragraphLike);

        if (this.sections.length === 0) {

            this.addSection({ title: "" });

        }

        this.sections[0].paragraphs.push(para);

        this.touch();

        return para;

    }

    /* ---------- Images ---------- */

    addImage(imageLike) {

        const img = imageLike instanceof Image
            ? imageLike
            : new Image(imageLike);

        this.images.push(img);

        this.touch();

        return img;

    }

    /* ---------- Tables ---------- */

    addTable(tableLike) {

        const tbl = tableLike instanceof Table
            ? tableLike
            : new Table(tableLike);

        this.tables.push(tbl);

        this.touch();

        return tbl;

    }

    /* ---------- Text helpers ---------- */

    plainText() {

        return this.sections
            .map(s => {
                const title = s.title ? `${s.title}\n\n` : "";
                return title + (typeof s.plainText === "function" ? s.plainText() : "");
            })
            .join("\n\n");

    }

    wordCount() {

        return this.sections.reduce((sum, s) => sum + (s.wordCount?.() || 0), 0);

    }

    estimatedReadingMinutes(wpm = 200) {

        return Math.max(1, Math.round(this.wordCount() / wpm));

    }

    /* ---------- Persistence ---------- */

    toJSON() {

        return {
            id: this.id,
            title: this.title,
            source: this.source,
            language: this.language,
            sectionCount: this.sectionCount,
            imageCount: this.images.length,
            tableCount: this.tables.length,
            wordCount: this.wordCount(),
            estimatedReadingMinutes: this.estimatedReadingMinutes(),
            metadata: this.metadata,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };

    }

}