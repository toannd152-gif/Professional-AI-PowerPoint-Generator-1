/**
 * PresentationBuilder
 *
 * Stage 5 of the parsing pipeline.
 *
 *     Knowledge + DocumentModel  --(builder)-->  Presentation
 *
 * Converts a Knowledge model + DocumentModel into a typed
 * Presentation object. The legacy SlidePlanner is kept
 * available for backwards compatibility, but the new
 * PresentationBuilder is the canonical path.
 */

import {
    Presentation,
    Slide,
    SLIDE_TYPES
} from "../../models/index.js";

let counter = 0;

function uid(prefix = "slide") {

    counter += 1;

    return `${prefix}-${Date.now().toString(36)}-${counter}`;

}

export class PresentationBuilder {

    constructor(options = {}) {

        this.maxBullets = options.maxBullets ?? 5;
        this.maxBulletLength = options.maxBulletLength ?? 140;
        this.includeTitle = options.includeTitle ?? true;
        this.includeSummary = options.includeSummary ?? true;
        this.themeId = options.themeId ?? "ocean";

    }

    build({ knowledge, documentModel, title = null }) {

        const doc = documentModel.document || documentModel;

        const presTitle = title || doc.title || knowledge?.summary?.slice(0, 60) || "Presentation";

        const pres = new Presentation({
            id: uid("pres"),
            title: presTitle,
            themeId: this.themeId,
            language: doc.language || "vi"
        });

        if (this.includeTitle) {

            pres.addSlide(this._makeTitleSlide(presTitle, knowledge));

        }

        for (const section of doc.sections) {

            const slide = this._makeContentSlide(section);

            if (slide) pres.addSlide(slide);

        }

        if (this.includeSummary && knowledge) {

            pres.addSlide(this._makeSummarySlide(knowledge));

        }

        return pres;

    }

    _makeTitleSlide(title, knowledge) {

        const stats = knowledge?.statistics || {};

        const subtitle = stats.words
            ? `${stats.sections ?? 0} phần · ${stats.words.toLocaleString("vi-VN")} từ · ~${stats.readingMinutes ?? 0} phút đọc`
            : "";

        return new Slide({
            id: uid("title"),
            type: SLIDE_TYPES.TITLE,
            title,
            subtitle,
            bullets: [],
            layout: "title-only"
        });

    }

    _makeContentSlide(section) {

        const bullets = this._makeBullets(section);

        if (!bullets.length && !section.title) return null;

        return new Slide({
            id: uid("content"),
            type: SLIDE_TYPES.CONTENT,
            title: section.title || `Phần`,
            subtitle: "",
            bullets,
            notes: (section.plainText?.() || "").slice(0, 500),
            layout: bullets.length > 4 ? "two-column" : "default"
        });

    }

    _makeSummarySlide(knowledge) {

        const keywords = (knowledge.keywords || [])
            .slice(0, 8)
            .map(k => `${k.word} (${k.count})`);

        return new Slide({
            id: uid("summary"),
            type: SLIDE_TYPES.SUMMARY,
            title: "Tổng kết",
            subtitle: "Từ khóa chính",
            bullets: keywords,
            notes: knowledge.summary || "",
            layout: "default"
        });

    }

    _makeBullets(section) {

        const sentences = [];

        for (const p of section.paragraphs || []) {

            if (p.sentences?.length) {

                sentences.push(...p.sentences);

            } else if (p.text) {

                sentences.push(p.text);

            }

        }

        if (!sentences.length) {

            const text = section.plainText?.() || "";

            if (text) sentences.push(text);

        }

        return sentences
            .slice(0, this.maxBullets)
            .map(s => this._truncate(String(s).trim(), this.maxBulletLength))
            .filter(Boolean);

    }

    _truncate(text, max) {

        if (text.length <= max) return text;

        const cut = text.slice(0, max);

        const lastSpace = cut.lastIndexOf(" ");

        return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut) + "…";

    }

}