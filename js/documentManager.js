/**
 * Document Manager
 *
 * Runs the decoupled domain chain on every import (yêu cầu #4):
 *
 *     Parser → RawDocument → DocumentModel → Knowledge
 *
 * Each intermediate layer is stored separately so any stage
 * (AI engine, planner, renderer) can be swapped without
 * touching the parser side:
 *
 *     store.raw            RawDocument   (stage 1)
 *     store.documentModel  DocumentModel (stage 2)
 *     store.knowledge      Knowledge     (stage 3)
 *     store.document       RawDocument   (legacy alias for UI modules)
 */

import { ParserManager } from "./parsers/parserManager.js";
import { DocumentModelBuilder } from "./builders/documentModelBuilder.js";
import { KnowledgeBuilder } from "./builders/knowledgeBuilder.js";

export class DocumentManager {

    constructor(store, events, logger = null, options = {}) {

        this.store = store;
        this.events = events;
        this.logger = logger;

        this.parserManager = options.parserManager || new ParserManager({ logger });
        this.documentModelBuilder = options.documentModelBuilder || new DocumentModelBuilder();
        this.knowledgeBuilder = options.knowledgeBuilder || new KnowledgeBuilder();

        this.performanceMonitor = options.performanceMonitor || null;

    }

    async import(file) {

        try {

            this.logger?.info("Import:", file.name);

            /* ---- Stage 1: Parser → RawDocument ---- */

            const raw = await this._timed("parse", () => this.parserManager.parse(file));

            /* ---- Stage 2: RawDocument → DocumentModel ---- */

            const documentModel = await this._timed("document-model", () =>
                this.documentModelBuilder.build(raw)
            );

            /* ---- Stage 3: DocumentModel → Knowledge ---- */

            const knowledge = await this._timed("knowledge", () =>
                this.knowledgeBuilder.build(documentModel, documentModel.title)
            );

            /* ---- Persist every layer ---- */

            this.store.set("raw", raw);
            this.store.set("documentModel", documentModel);
            this.store.set("knowledge", knowledge);

            /* Legacy alias: old UI modules read "document". */

            this.store.set("document", raw);

            this.store.set("project", {
                name: (raw.title || "").replace(/\.(pdf|txt|md|html?|markdown)$/i, "")
            });

            /*
            New document invalidates previous pipeline results.
            */
            this.store.set("analysis", null);
            this.store.set("slides", []);

            this.events.emit("document:parsed", raw);
            this.events.emit("domain:ready", { raw, documentModel, knowledge });

            return raw;

        } catch (error) {

            this.logger?.error(error);

            this.events.emit("document:error", error);

            return null;

        }

    }

    /* ---------- helpers ---------- */

    async _timed(name, fn) {

        if (this.performanceMonitor?.time) {

            return this.performanceMonitor.time(name, fn);

        }

        return fn();

    }

}
