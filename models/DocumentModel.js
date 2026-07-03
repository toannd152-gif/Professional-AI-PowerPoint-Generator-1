/**
 * DocumentModel
 *
 * Stage 2 of the parsing pipeline. A typed, structured view
 * of a source document — fully built from a RawDocument.
 *
 * DocumentModel is the canonical, format-agnostic object that
 * downstream code (KnowledgeExtractor, SlidePlanner,
 * Renderer...) consumes.
 *
 * Construction is the responsibility of `DocumentModelBuilder`
 * (js/builders/documentModelBuilder.js). This class is the
 * pure value-object side.
 */

import { BaseModel } from "./BaseModel.js";
import { Document } from "./Document.js";
import { Section } from "./Section.js";
import { Paragraph } from "./Paragraph.js";
import { Image } from "./Image.js";
import { Table } from "./Table.js";

export class DocumentModel extends BaseModel {

    constructor({
        id,
        document = null,           // Document instance
        structure = {},            // { headings: [...], outline: [...] }
        stats = {},                // { pages, words, characters, sentences, ... }
        metadata = {}
    } = {}) {

        super(id);

        this.document = document || new Document();

        this.structure = structure;
        this.stats = stats;
        this.metadata = metadata;

    }

    /* ---------- Delegation helpers ---------- */

    get title() {

        return this.document.title;

    }

    get sections() {

        return this.document.sections;

    }

    get paragraphs() {

        return this.document.paragraphs;

    }

    get images() {

        return this.document.images;

    }

    get tables() {

        return this.document.tables;

    }

    get sectionCount() {

        return this.document.sectionCount;

    }

    get wordCount() {

        return this.document.wordCount();

    }

    get estimatedReadingMinutes() {

        return this.document.estimatedReadingMinutes();

    }

    /* ---------- Section lookup ---------- */

    findSection(predicate) {

        return this.sections.find(predicate);

    }

    sectionByTitle(title) {

        return this.sections.find(s => s.title === title);

    }

    /* ---------- Outline helpers ---------- */

    getOutline() {

        return this.sections.map((s, i) => ({
            index: i,
            id: s.id,
            title: s.title || `(Section ${i + 1})`,
            level: s.level || 1,
            wordCount: s.wordCount?.() || 0
        }));

    }

    /* ---------- Snapshot ---------- */

    snapshot() {

        return {
            id: this.id,
            title: this.title,
            sectionCount: this.sectionCount,
            wordCount: this.wordCount,
            stats: this.stats,
            outline: this.getOutline()
        };

    }

    /* ---------- Validation ---------- */

    validate() {

        if (!this.document) return false;

        if (this.sectionCount === 0) return false;

        return true;

    }

    /* ---------- Hydrate a plain object (e.g. from localStorage) ---------- */

    static fromJSON(data) {

        const doc = new Document({
            id: data.document?.id,
            title: data.document?.title || data.title || "Untitled",
            source: data.document?.source,
            language: data.document?.language,
            metadata: data.document?.metadata || {}
        });

        for (const sec of data.document?.sections || []) {

            const section = new Section({
                id: sec.id,
                title: sec.title,
                level: sec.level,
                order: sec.order,
                metadata: sec.metadata || {}
            });

            for (const p of sec.paragraphs || []) {

                section.paragraphs.push(
                    p instanceof Paragraph ? p : new Paragraph(p)
                );

            }

            for (const img of sec.images || []) {

                section.images.push(
                    img instanceof Image ? img : new Image(img)
                );

            }

            for (const tbl of sec.tables || []) {

                section.tables.push(
                    tbl instanceof Table ? tbl : new Table(tbl)
                );

            }

            doc.sections.push(section);

        }

        return new DocumentModel({
            id: data.id,
            document: doc,
            structure: data.structure || {},
            stats: data.stats || {},
            metadata: data.metadata || {}
        });

    }

}