/**
 * Slide
 *
 * A single slide in a Presentation.
 *
 * Carries typed layout blocks (title, bullets, image, table,
 * chart, quote) so that any renderer (PPT/HTML/JSON) can
 * iterate through them.
 */

import { BaseModel } from "./BaseModel.js";
import { Image } from "./Image.js";
import { Table } from "./Table.js";
import { Chart } from "./Chart.js";

export const SLIDE_TYPES = Object.freeze({
    TITLE: "title",
    CONTENT: "content",
    SECTION: "section",
    SUMMARY: "summary",
    IMAGE: "image",
    QUOTE: "quote",
    CHART: "chart",
    TABLE: "table"
});

export class Slide extends BaseModel {

    constructor({
        id,
        type = "content",
        title = "",
        subtitle = "",
        bullets = [],
        blocks = [],          // mixed blocks (see addBlock)
        notes = "",
        order = 0,
        layout = "default",   // "default" | "two-column" | "title-only"
        theme = null,
        image = null,
        table = null,
        chart = null,
        metadata = {}
    } = {}) {

        super(id);

        this.type = type;
        this.title = title;
        this.subtitle = subtitle;
        this.bullets = bullets;
        this.blocks = blocks;

        this.notes = notes;
        this.order = order;
        this.layout = layout;
        this.theme = theme;

        this.image = image;     // optional Image instance
        this.table = table;     // optional Table instance
        this.chart = chart;     // optional Chart instance

        this.metadata = metadata;

    }

    /* ---------- Block helpers (typed) ---------- */

    addBlock(block) {

        this.blocks.push(block);

        this.touch();

        return block;

    }

    addBullet(text) {

        this.bullets.push(text);

        this.touch();

    }

    setBullets(bullets) {

        this.bullets = Array.isArray(bullets) ? [...bullets] : [];

        this.touch();

    }

    setImage(imageLike) {

        this.image = imageLike instanceof Image
            ? imageLike
            : new Image(imageLike);

        this.touch();

    }

    setTable(tableLike) {

        this.table = tableLike instanceof Table
            ? tableLike
            : new Table(tableLike);

        this.touch();

    }

    setChart(chartLike) {

        this.chart = chartLike instanceof Chart
            ? chartLike
            : new Chart(chartLike);

        this.touch();

    }

    /* ---------- Counts ---------- */

    get bulletCount() {

        return this.bullets.length;

    }

    wordCount() {

        const parts = [this.title, this.subtitle, this.notes, ...this.bullets];

        return parts
            .filter(Boolean)
            .join(" ")
            .split(/\s+/)
            .filter(Boolean).length;

    }

    isTitle() {

        return this.type === SLIDE_TYPES.TITLE;

    }

    isSummary() {

        return this.type === SLIDE_TYPES.SUMMARY;

    }

    /* ---------- Validation ---------- */

    validate() {

        if (!this.title || !String(this.title).trim()) return false;

        return true;

    }

    toJSON() {

        return {
            id: this.id,
            type: this.type,
            order: this.order,
            title: this.title,
            subtitle: this.subtitle,
            bullets: this.bullets,
            bulletCount: this.bulletCount,
            blockCount: this.blocks.length,
            wordCount: this.wordCount(),
            layout: this.layout,
            hasImage: !!this.image,
            hasTable: !!this.table,
            hasChart: !!this.chart,
            notes: this.notes,
            metadata: this.metadata,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };

    }

    static fromJSON(data = {}) {

        const slide = new Slide({

            id: data.id,
            type: data.type || SLIDE_TYPES.CONTENT,
            title: data.title || "",
            subtitle: data.subtitle || "",
            bullets: Array.isArray(data.bullets) ? [...data.bullets] : [],
            blocks: Array.isArray(data.blocks) ? [...data.blocks] : [],
            notes: data.notes || "",
            order: data.order ?? 0,
            layout: data.layout || "default",
            theme: data.theme,
            metadata: data.metadata || {}

        });

        if (data.image) slide.setImage(Image.fromJSON(data.image));
        if (data.table) slide.setTable(Table.fromJSON(data.table));
        if (data.chart) slide.setChart(Chart.fromJSON(data.chart));

        return slide;

    }

    /**
     * Build a Slide from the legacy plain-object format that
     * SlidePlanner still produces. The Domain Layer treats
     * this as a compatibility layer — older code keeps
     * working while we migrate to the typed model.
     */
    static fromLegacy(legacy = {}) {

        return new Slide({
            id: legacy.id,
            type: legacy.type || SLIDE_TYPES.CONTENT,
            title: legacy.title || "",
            subtitle: legacy.subtitle || "",
            bullets: legacy.bullets || [],
            notes: legacy.notes || "",
            order: legacy.order ?? 0,
            layout: legacy.layout || "default"
        });

    }

}