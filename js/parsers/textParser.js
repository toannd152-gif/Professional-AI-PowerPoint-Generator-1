/*
============================================================

Text Parser  →  RawDocument (format: "txt")

============================================================
*/

import { BaseParser } from "./baseParser.js";
import { readText } from "../utils.js";

export class TextParser extends BaseParser {

    getSupportedExtensions() {

        return [".txt"];

    }

    async parse(file) {

        const text = await readText(file);

        return this.createRawDocument({

            title: file.name,
            format: "txt",
            pages: [{ pageNumber: 1, text }],
            metadata: {
                type: "text",
                name: file.name,
                fileSize: file.size
            }

        });

    }

}
