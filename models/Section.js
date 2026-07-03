/**
 * Section
 *
 * A grouped chunk of a document — chapter, heading block,
 * or any semantically coherent region.
 */

import { BaseModel } from "./BaseModel.js";
import { Paragraph } from "./Paragraph.js";
import { Image } from "./Image.js";
import { Table } from "./Table.js";

export class Section extends BaseModel {

    constructor({
        id,
        title = "",
        level = 1,
        order = 0,
        paragraphs = [],
        images = [],
        tables = [],
        metadata = {}
    } = {}) {

        super(id);

        this.title = title;
        this.level = level;            // 1 = chapter, 2 = sub-section ...
        this.order = order;

        /*
        Children are kept as plain objects OR model instances.
        Use the helper methods (addParagraph...) to keep API
        consistent.
        */
        this.paragraphs = paragraphs;
        this.images = images;
        this.tables = tables;

        this.metadata = metadata;

    }

    /* ---------- Mutators ---------- */

    /**
     * Accepts a string, a plain object, or a Paragraph:
     *
     *     section.addParagraph("văn bản")
     *     section.addParagraph("văn bản", "quote")
     *     section.addParagraph({ text: "văn bản", type: "list" })
     *     section.addParagraph(new Paragraph({ text: "văn bản" }))
     */
    addParagraph(paragraphLike, type = "text") {

        let p;

        if (paragraphLike instanceof Paragraph) {

            p = paragraphLike;

            if (p.order == null || p.order === 0) p.order = this.paragraphs.length;

        } else if (typeof paragraphLike === "object" && paragraphLike !== null) {

            p = new Paragraph({
                order: this.paragraphs.length,
                ...paragraphLike
            });

        } else {

            p = new Paragraph({
                text: String(paragraphLike ?? ""),
                type,
                order: this.paragraphs.length
            });

        }

        this.paragraphs.push(p);

        this.touch();

        return p;

    }

    addImage(imageLike) {

        const img = imageLike instanceof Image ? imageLike : new Image(imageLike);

        this.images.push(img);

        this.touch();

        return img;

    }

    addTable(tableLike) {

        const tbl = tableLike instanceof Table ? tableLike : new Table(tableLike);

        this.tables.push(tbl);

        this.touch();

        return tbl;

    }

    /* ---------- Queries ---------- */

    isEmpty() {

        return this.paragraphs.length === 0
            && this.images.length === 0
            && this.tables.length === 0;

    }

    wordCount() {

        return this.paragraphs.reduce((sum, p) => {

            const text = typeof p === "string" ? p : (p.text || "");

            return sum + text.split(/\s+/).filter(Boolean).length;

        }, 0);

    }

    sentenceCount() {

        return this.paragraphs.reduce((sum, p) => {

            if (typeof p === "string") {

                return sum + p.split(/[.!?…]+/).filter(Boolean).length;

            }

            return sum + (p.sentenceCount?.() || 0);

        }, 0);

    }

    plainText() {

        return this.paragraphs
            .map(p => typeof p === "string" ? p : (p.text || ""))
            .join("\n\n");

    }

    /* ---------- Persistence ---------- */

    toJSON() {

        return {
            id: this.id,
            title: this.title,
            level: this.level,
            order: this.order,
            paragraphs: this.paragraphs.map(p => p?.toJSON ? p.toJSON() : p),
            images: this.images.map(i => i?.toJSON ? i.toJSON() : i),
            tables: this.tables.map(t => t?.toJSON ? t.toJSON() : t),
            paragraphCount: this.paragraphs.length,
            imageCount: this.images.length,
            tableCount: this.tables.length,
            wordCount: this.wordCount(),
            sentenceCount: this.sentenceCount(),
            metadata: this.metadata,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };

    }

    static fromJSON(data = {}) {

        const section = new Section({

            id: data.id,
            title: data.title,
            level: data.level,
            order: data.order,
            metadata: data.metadata || {}

        });

        for (const p of data.paragraphs || []) {

            section.paragraphs.push(
                p instanceof Paragraph ? p : new Paragraph(p)
            );

        }

        for (const img of data.images || []) {

            section.images.push(
                img instanceof Image ? img : new Image(img)
            );

        }

        for (const tbl of data.tables || []) {

            section.tables.push(
                tbl instanceof Table ? tbl : new Table(tbl)
            );

        }

        return section;

    }

    /* ---------- Validation ---------- */

    validate() {

        return Array.isArray(this.paragraphs);

    }

}