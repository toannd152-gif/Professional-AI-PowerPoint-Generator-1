/*
============================================================

Base Parser

Every concrete parser MUST return a RawDocument (yêu cầu #4):

    Parser  →  RawDocument  →  DocumentModel  →  Knowledge  →  Planner

The parser layer knows NOTHING about the AI/analysis layer.
It only normalizes bytes into pages of raw text/markdown/html.

============================================================
*/

import { RawDocument } from "../../models/RawDocument.js";

export class BaseParser {

    constructor(store, events) {

        this.store = store;

        this.events = events;

    }

    /**
     * Supported extensions
     */
    getSupportedExtensions() {

        return [];

    }

    /**
     * Parse document — must resolve to a RawDocument.
     */
    async parse(file) {

        throw new Error(
            "parse() must be implemented."
        );

    }

    /**
     * Build the Stage-1 domain object every parser returns.
     *
     *     pages: [{ pageNumber, text?, markdown?, html?, images?, tables? }]
     */
    createRawDocument({ title = "Untitled", format = "unknown", pages = [], metadata = {} } = {}) {

        return new RawDocument({ title, format, pages, metadata });

    }

    /**
     * @deprecated — legacy plain-object shape. Kept only so
     * third-party parsers written against the old API keep
     * working; ParserManager wraps the result in RawDocument.
     */
    createDocument() {

        return {
            title: "",
            pages: [],
            metadata: {},
            assets: []
        };

    }

}
