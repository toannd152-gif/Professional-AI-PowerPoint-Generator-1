/*
============================================================

Markdown Parser  →  RawDocument (format: "md")

Keeps BOTH the raw markdown and a plain-text projection so
downstream builders can pick either representation.

============================================================
*/

import { BaseParser } from "./baseParser.js";
import { readText } from "../utils.js";

export class MarkdownParser extends BaseParser {

    getSupportedExtensions() {

        return [".md", ".markdown"];

    }

    async parse(file) {

        const markdown = await readText(file);

        return this.createRawDocument({

            title: this._extractTitle(markdown) || file.name,
            format: "md",
            pages: [{
                pageNumber: 1,
                markdown,
                text: this._toPlainText(markdown)
            }],
            metadata: {
                type: "markdown",
                name: file.name,
                fileSize: file.size
            }

        });

    }

    /* First "# Heading" becomes the document title. */

    _extractTitle(markdown) {

        const match = markdown.match(/^#\s+(.+)$/m);

        return match ? match[1].trim() : null;

    }

    /* Cheap markdown → text projection (no external libs). */

    _toPlainText(markdown) {

        return markdown
            .replace(/```[\s\S]*?```/g, "")            // code fences
            .replace(/`([^`]+)`/g, "$1")               // inline code
            .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")  // images → alt
            .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")   // links → label
            .replace(/^#{1,6}\s+/gm, "")               // heading markers
            .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, "$1")  // emphasis
            .replace(/^>\s?/gm, "")                    // blockquotes
            .replace(/^[-+*]\s+/gm, "")                // list bullets
            .trim();

    }

}
