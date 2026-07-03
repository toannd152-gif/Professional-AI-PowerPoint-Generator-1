/**
 * Knowledge
 *
 * Stage 3 of the parsing pipeline — a semantic layer above
 * the DocumentModel.
 *
 * The Knowledge model holds:
 *   - summary           (string)
 *   - keyPoints         (string[])   — bullet-ready facts
 *   - keywords          ([{ word, count }])
 *   - entities          ([{ type, value }])
 *   - questions         (string[])   — generated questions
 *   - statistics        ({ words, sentences, sections, ... })
 *
 * Produced by `KnowledgeBuilder` (a downstream service).
 */

import { BaseModel } from "./BaseModel.js";

export const ENTITY_TYPES = Object.freeze({
    PERSON: "person",
    ORGANIZATION: "organization",
    LOCATION: "location",
    DATE: "date",
    NUMBER: "number",
    TERM: "term"
});

export class Knowledge extends BaseModel {

    constructor({
        id,
        summary = "",
        keyPoints = [],
        keywords = [],
        entities = [],
        questions = [],
        statistics = {},
        topics = [],
        sourceId = null,
        metadata = {}
    } = {}) {

        super(id);

        this.summary = summary;
        this.keyPoints = keyPoints;
        this.keywords = keywords;
        this.entities = entities;
        this.questions = questions;
        this.statistics = statistics;
        this.topics = topics;
        this.sourceId = sourceId;
        this.metadata = metadata;

    }

    /* ---------- Mutators ---------- */

    addKeyPoint(point) {

        this.keyPoints.push(point);

        this.touch();

    }

    addKeyword(word, count = 1) {

        const existing = this.keywords.find(k => k.word === word);

        if (existing) {

            existing.count += count;

        } else {

            this.keywords.push({ word, count });

        }

        this.touch();

    }

    addEntity(type, value) {

        this.entities.push({ type, value });

        this.touch();

    }

    addQuestion(question) {

        this.questions.push(question);

        this.touch();

    }

    setSummary(summary) {

        this.summary = summary;

        this.touch();

    }

    /* ---------- Accessors ---------- */

    topKeywords(n = 10) {

        return [...this.keywords]
            .sort((a, b) => b.count - a.count)
            .slice(0, n);

    }

    entitiesByType(type) {

        return this.entities.filter(e => e.type === type);

    }

    isEmpty() {

        return this.keyPoints.length === 0
            && this.keywords.length === 0
            && this.summary.length === 0;

    }

    /* ---------- Snapshot ---------- */

    snapshot() {

        return {
            id: this.id,
            summary: this.summary,
            keyPointCount: this.keyPoints.length,
            keywordCount: this.keywords.length,
            entityCount: this.entities.length,
            questionCount: this.questions.length,
            topicCount: this.topics.length,
            statistics: this.statistics,
            sourceId: this.sourceId
        };

    }

    toJSON() {

        return {
            id: this.id,
            summary: this.summary,
            keyPoints: this.keyPoints,
            keywords: this.keywords,
            entities: this.entities,
            questions: this.questions,
            statistics: this.statistics,
            topics: this.topics,
            sourceId: this.sourceId,
            metadata: this.metadata,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };

    }

    static fromJSON(data = {}) {

        return new Knowledge({

            id: data.id,
            summary: data.summary || "",
            keyPoints: Array.isArray(data.keyPoints) ? [...data.keyPoints] : [],
            keywords: Array.isArray(data.keywords) ? data.keywords.map(k => ({ ...k })) : [],
            entities: Array.isArray(data.entities) ? data.entities.map(e => ({ ...e })) : [],
            questions: Array.isArray(data.questions) ? [...data.questions] : [],
            statistics: data.statistics || {},
            topics: Array.isArray(data.topics) ? data.topics.map(t => ({ ...t })) : [],
            sourceId: data.sourceId,
            metadata: data.metadata || {}

        });

    }

    /* ---------- Validation ---------- */

    validate() {

        return Array.isArray(this.keywords) && Array.isArray(this.keyPoints);

    }

}