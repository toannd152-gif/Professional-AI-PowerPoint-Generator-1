/**
 * Presentation
 *
 * Top-level domain entity for the OUTPUT side of the
 * pipeline. Holds a collection of Slide instances plus
 * metadata about the whole deck.
 */

import { BaseModel } from "./BaseModel.js";
import { Slide } from "./Slide.js";

export class Presentation extends BaseModel {

    constructor({
        id,
        title = "Untitled Presentation",
        author = "AI PPT Generator",
        slides = [],
        themeId = "ocean",
        language = "vi",
        metadata = {}
    } = {}) {

        super(id);

        this.title = title;
        this.author = author;
        this.slides = slides;          // Slide[]
        this.themeId = themeId;
        this.language = language;
        this.metadata = metadata;

    }

    /* ---------- Slide management ---------- */

    addSlide(slideLike) {

        const slide = slideLike instanceof Slide
            ? slideLike
            : Slide.fromLegacy(slideLike || {});

        slide.order = this.slides.length;

        this.slides.push(slide);

        this.touch();

        return slide;

    }

    insertSlide(slideLike, index) {

        const slide = slideLike instanceof Slide
            ? slideLike
            : Slide.fromLegacy(slideLike || {});

        slide.order = index;

        this.slides.splice(index, 0, slide);

        this._reindex();

        this.touch();

        return slide;

    }

    removeSlide(slideId) {

        const idx = this.slides.findIndex(s => s.id === slideId);

        if (idx < 0) return false;

        this.slides.splice(idx, 1);

        this._reindex();

        this.touch();

        return true;

    }

    moveSlide(slideId, delta) {

        const idx = this.slides.findIndex(s => s.id === slideId);

        if (idx < 0) return false;

        const target = idx + delta;

        if (target < 0 || target >= this.slides.length) return false;

        [this.slides[idx], this.slides[target]] = [this.slides[target], this.slides[idx]];

        this._reindex();

        this.touch();

        return true;

    }

    updateSlide(slideId, changes) {

        const slide = this.slides.find(s => s.id === slideId);

        if (!slide) return false;

        Object.assign(slide, changes);

        slide.touch();

        this.touch();

        return true;

    }

    _reindex() {

        this.slides.forEach((s, i) => { s.order = i; });

    }

    /* ---------- Accessors ---------- */

    get slideCount() {

        return this.slides.length;

    }

    get titleSlide() {

        return this.slides.find(s => s.type === "title") || this.slides[0] || null;

    }

    slideAt(index) {

        return this.slides[index] || null;

    }

    slideById(id) {

        return this.slides.find(s => s.id === id) || null;

    }

    /* ---------- Stats ---------- */

    totalWordCount() {

        return this.slides.reduce((sum, s) => sum + (s.wordCount?.() || 0), 0);

    }

    estimatedDuration(minutesPerSlide = 1.5) {

        return Math.max(1, Math.round(this.slideCount * minutesPerSlide));

    }

    /* ---------- Validation / Snapshot ---------- */

    validate() {

        return this.slides.length > 0;

    }

    snapshot() {

        return {
            id: this.id,
            title: this.title,
            slideCount: this.slideCount,
            themeId: this.themeId,
            totalWordCount: this.totalWordCount(),
            estimatedDuration: this.estimatedDuration(),
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };

    }

    toJSON() {

        return {
            id: this.id,
            title: this.title,
            author: this.author,
            themeId: this.themeId,
            language: this.language,
            slideCount: this.slideCount,
            totalWordCount: this.totalWordCount(),
            slides: this.slides.map(s => s instanceof Slide ? s.toJSON() : s),
            metadata: this.metadata,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };

    }

    static fromJSON(data = {}) {

        const pres = new Presentation({

            id: data.id,
            title: data.title || "Untitled Presentation",
            author: data.author || "AI PPT Generator",
            themeId: data.themeId || "ocean",
            language: data.language || "vi",
            metadata: data.metadata || {}

        });

        for (const s of data.slides || []) {

            pres.slides.push(s instanceof Slide ? s : Slide.fromJSON(s));

        }

        pres._reindex();

        return pres;

    }

    /**
     * Build from legacy plain-object slides (compat layer).
     */
    static fromLegacy({ title = "Presentation", author = "AI PPT Generator", slides = [], themeId = "ocean" } = {}) {

        const pres = new Presentation({ title, author, themeId });

        for (const s of slides) {

            pres.addSlide(s);

        }

        return pres;

    }

}