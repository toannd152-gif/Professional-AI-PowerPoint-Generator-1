/*
================================================

Parser Manager

Routes a File / Blob to the right parser based on the
extension. PDF is loaded LAZILY because pdf.js is a
browser-only bundle — loading it eagerly would break the
Node-side integration test.

================================================
*/

import { TextParser } from "./textParser.js";
import { MarkdownParser } from "./markdownParser.js";
import { HTMLParser } from "./htmlParser.js";
import { RawDocument } from "../../models/RawDocument.js";

export class ParserManager {

    constructor(options = {}) {

        this.textParser = new TextParser();
        this.markdownParser = new MarkdownParser();
        this.htmlParser = new HTMLParser();

        this.pdfParser = null;
        this.pdfParserLoader = options.pdfParserLoader || (async () => {

            const { PDFParser } = await import("./pdfParser.js");
            return new PDFParser();

        });

        this.logger = options.logger || null;

    }

    /**
     * Lazy access to the PDF parser — never instantiated
     * until somebody actually parses a .pdf file.
     */
    async _getPdfParser() {

        if (this.pdfParser) return this.pdfParser;

        this.pdfParser = await this.pdfParserLoader();

        return this.pdfParser;

    }

    /**
     * Parse document. ALWAYS resolves to a RawDocument —
     * even if a legacy / third-party parser returns the old
     * plain-object shape.
     */
    async parse(file) {

        const extension =
            (file.name || "")
                .split(".")
                .pop()
                .toLowerCase();

        let result;

        switch (extension) {

            case "pdf": {

                const parser = await this._getPdfParser();
                result = await parser.parse(file);
                break;

            }

            case "txt":
                result = await this.textParser.parse(file);
                break;

            case "md":
            case "markdown":
                result = await this.markdownParser.parse(file);
                break;

            case "html":
            case "htm":
                result = await this.htmlParser.parse(file);
                break;

            default:
                throw new Error(`Unsupported file type: ${extension}`);

        }

        return this._normalize(result, extension, file);

    }

    /**
     * Contract enforcement for the pipeline (yêu cầu #4):
     * Parser → RawDocument, no exceptions.
     */
    _normalize(result, extension, file) {

        if (result instanceof RawDocument) return result;

        const pages = (result?.pages || []).map((p, i) => ({
            pageNumber: p.pageNumber ?? (p.index != null ? p.index + 1 : i + 1),
            text: p.text ?? p.content ?? undefined,
            markdown: p.markdown,
            html: p.html,
            images: p.images,
            tables: p.tables
        }));

        return new RawDocument({
            title: result?.title || file?.name || "Untitled",
            format: result?.metadata?.type || extension || "unknown",
            pages,
            metadata: result?.metadata || {}
        });

    }

    /**
     * Returns the list of extensions this manager can route.
     */
    supportedExtensions() {

        return ["pdf", "txt", "md", "markdown", "html", "htm"];

    }

}