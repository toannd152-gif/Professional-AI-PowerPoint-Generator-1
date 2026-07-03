/**
 * Domain Model Index
 *
 * Single import surface for the entire Domain Layer.
 *
 *     import {
 *         Document, Section, Paragraph, Image, Table, Chart,
 *         Slide, Presentation, Knowledge,
 *         RawDocument, DocumentModel, BaseModel,
 *         CHART_TYPES, SLIDE_TYPES, ENTITY_TYPES
 *     } from "../models/index.js";
 *
 * Every entity follows the same shape:
 *   - extends BaseModel (id, createdAt, updatedAt, metadata)
 *   - has validate()       — schema-level invariants
 *   - has toJSON()         — JSON-safe snapshot
 *   - has static fromJSON() — hydrate from a JSON object (round-trip)
 *
 * That keeps the Domain Layer serializable, which is what
 * makes checkpoints / recovery / persistence work.
 */

export { BaseModel } from "./BaseModel.js";

export { Paragraph, PARAGRAPH_TYPES } from "./Paragraph.js";

export { Image }       from "./Image.js";
export { Table }       from "./Table.js";
export { Chart, CHART_TYPES } from "./Chart.js";

export { Section }     from "./Section.js";
export { Document }    from "./Document.js";

export { RawDocument }      from "./RawDocument.js";
export { DocumentModel }    from "./DocumentModel.js";

export { Knowledge, ENTITY_TYPES } from "./Knowledge.js";

export { Slide,    SLIDE_TYPES }   from "./Slide.js";
export { Presentation }            from "./Presentation.js";

/* ------------------------------------------------------------------ */
/*  Aggregate factory — convenient single-call rehydration             */
/* ------------------------------------------------------------------ */

/**
 * Rehydrate a full Domain snapshot (DocumentModel +
 * Knowledge + Presentation + raw) from a JSON tree, e.g.
 * something the RecoveryManager pulled out of localStorage.
 */
export function hydrateDomain(snapshot = {}) {

    const DocumentModelCtor   = DocumentModel;
    const KnowledgeCtor       = Knowledge;
    const PresentationCtor    = Presentation;

    return {

        documentModel: snapshot.documentModel
            ? DocumentModelCtor.fromJSON(snapshot.documentModel)
            : null,

        knowledge: snapshot.knowledge
            ? KnowledgeCtor.fromJSON(snapshot.knowledge)
            : null,

        presentation: snapshot.presentation
            ? PresentationCtor.fromJSON(snapshot.presentation)
            : null,

        raw: snapshot.raw || null

    };

}

/* ------------------------------------------------------------------ */
/*  Domain version — bump when serialized shape changes                */
/* ------------------------------------------------------------------ */

export const DOMAIN_VERSION = "1.0.0";