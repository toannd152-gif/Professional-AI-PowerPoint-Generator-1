/**
 * KnowledgeBuilder
 *
 * Stage 3 of the parsing pipeline.
 *
 *     DocumentModel  --(builder)-->  Knowledge
 *
 * Pulls the semantic layer (summary, key points, keywords,
 * entities, statistics) out of a DocumentModel.
 *
 * Heuristic-only — keeps the "offline AI" guarantee of the
 * project. Future implementations can swap this for an LLM
 * service without changing the public surface.
 */

import { Knowledge, ENTITY_TYPES } from "../../models/index.js";

const STOPWORDS = new Set([
    "và","của","là","có","các","được","cho","trong","với","một","những",
    "này","đó","khi","đã","để","không","người","cũng","như","từ","trên",
    "theo","về","ra","lại","thì","mà","nên","bị","vào","đến","hay","hoặc",
    "nếu","vì","do","tại","sau","trước","giữa","nhiều","rất","còn","phải",
    "sẽ","đang","làm","việc","bằng","cả","chỉ","tuy","nhưng","nó","họ",
    "the","a","an","and","or","of","to","in","on","for","with","is","are",
    "was","were","be","by","as","at","that","this","it","from","not","have",
    "has","had","but","they","their","we","you","he","she","his","her","its",
    "can","will","would","should","which","there","been","more","also","than"
]);

export class KnowledgeBuilder {

    constructor(options = {}) {

        this.keywordLimit = options.keywordLimit ?? 12;
        this.keyPointLimit = options.keyPointLimit ?? 8;
        this.maxEntityValueLen = options.maxEntityValueLen ?? 80;

    }

    /**
     * Public entry point.
     */
    build(documentModel, sourceTitle = null) {

        const doc = documentModel.document || documentModel;

        const title = sourceTitle || doc.title || documentModel.title || "Tài liệu";

        const knowledge = new Knowledge({
            sourceId: doc.id || documentModel.id,
            statistics: {
                pages: documentModel.stats?.pages ?? doc.sectionCount,
                sections: doc.sectionCount,
                words: documentModel.stats?.words ?? doc.wordCount(),
                sentences: documentModel.stats?.sentences ?? 0,
                characters: documentModel.stats?.characters ?? 0,
                readingMinutes: documentModel.stats?.readingMinutes ?? doc.estimatedReadingMinutes()
            }
        });

        /* ---------- summary ---------- */

        knowledge.setSummary(this._buildSummary(doc));

        /* ---------- keyPoints ---------- */

        for (const point of this._extractKeyPoints(doc)) {

            knowledge.addKeyPoint(point);

        }

        /* ---------- keywords ---------- */

        for (const k of this._extractKeywords(doc)) {

            knowledge.addKeyword(k.word, k.count);

        }

        /* ---------- entities ---------- */

        for (const e of this._extractEntities(doc)) {

            knowledge.addEntity(e.type, e.value);

        }

        /* ---------- questions ---------- */

        for (const q of this._generateQuestions(doc)) {

            knowledge.addQuestion(q);

        }

        /* ---------- topics ---------- */

        knowledge.topics = this._extractTopics(doc);

        return knowledge;

    }

    /* ------------------------------------------------------------------ */

    _buildSummary(doc) {

        const firstSection = doc.sections[0];

        if (!firstSection) return "";

        const firstPara = firstSection.paragraphs?.[0];

        if (!firstPara) return firstSection.title || "";

        const text = firstPara.text || "";

        if (text.length <= 240) return text;

        const cut = text.slice(0, 240);

        const lastSpace = cut.lastIndexOf(" ");

        return (lastSpace > 200 ? cut.slice(0, lastSpace) : cut) + "…";

    }

    _extractKeyPoints(doc) {

        const points = [];

        for (const section of doc.sections) {

            for (const p of section.paragraphs || []) {

                const text = (p.text || "").trim();

                if (!text) continue;

                if (text.length < 25 || text.length > 220) continue;

                points.push(text);

                if (points.length >= this.keyPointLimit * doc.sectionCount) break;

            }

            if (points.length >= this.keyPointLimit * doc.sectionCount) break;

        }

        return points.slice(0, this.keyPointLimit * Math.max(1, doc.sectionCount));

    }

    _extractKeywords(doc) {

        const freq = new Map();

        for (const section of doc.sections) {

            for (const p of section.paragraphs || []) {

                const text = (p.text || "").toLowerCase();

                const words = text
                    .replace(/[^\p{L}\p{N}\s]/gu, " ")
                    .split(/\s+/)
                    .filter(w => w.length >= 3 && !STOPWORDS.has(w) && !/^\d+$/.test(w));

                for (const w of words) {

                    freq.set(w, (freq.get(w) || 0) + 1);

                }

            }

        }

        return [...freq.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, this.keywordLimit)
            .map(([word, count]) => ({ word, count }));

    }

    _extractEntities(doc) {

        const entities = [];

        const seen = new Set();

        const push = (type, value) => {

            const v = (value || "").trim();

            if (!v || v.length > this.maxEntityValueLen) return;

            const key = `${type}:${v.toLowerCase()}`;

            if (seen.has(key)) return;

            seen.add(key);

            entities.push({ type, value: v });

        };

        for (const section of doc.sections) {

            const heading = section.title;

            if (heading) {

                if (/^(chương|chapter)\s+([\divxlc]+)/i.test(heading)) {

                    push(ENTITY_TYPES.TERM, heading);

                }

                if (/\b\d{4}\b/.test(heading)) {

                    const m = heading.match(/\b(\d{4})\b/);

                    if (m) push(ENTITY_TYPES.DATE, m[1]);

                }

            }

            for (const p of section.paragraphs || []) {

                const text = p.text || "";

                /* numbers */

                const numMatches = text.match(/\b\d{1,3}(?:[.,]\d+)*\b/g) || [];

                for (const n of numMatches.slice(0, 3)) {

                    push(ENTITY_TYPES.NUMBER, n);

                }

                /* dates */

                const dateMatches = text.match(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g) || [];

                for (const d of dateMatches.slice(0, 2)) {

                    push(ENTITY_TYPES.DATE, d);

                }

                /* capitalized multi-word terms (very rough) */

                const capMatches = text.match(/\b([A-ZÀ-Ỹ][a-zà-ỹ]+(?:\s+[A-ZÀ-Ỹ][a-zà-ỹ]+){1,3})\b/g) || [];

                for (const c of capMatches.slice(0, 3)) {

                    push(ENTITY_TYPES.TERM, c);

                }

            }

        }

        return entities;

    }

    _generateQuestions(doc) {

        const qs = [];

        for (const section of doc.sections.slice(0, 6)) {

            const title = section.title || "nội dung";

            qs.push(`Tóm tắt "${title}" trong 2 câu?`);

            qs.push(`Điểm quan trọng nhất của "${title}" là gì?`);

        }

        return qs;

    }

    _extractTopics(doc) {

        return doc.sections
            .map((s, i) => ({
                index: i,
                title: s.title || `Phần ${i + 1}`,
                wordCount: s.wordCount?.() || 0
            }))
            .filter(t => t.wordCount > 0);

    }

}