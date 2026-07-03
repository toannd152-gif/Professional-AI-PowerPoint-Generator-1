/*
============================================================

HTML Parser  →  RawDocument (format: "html")

============================================================
*/

import { BaseParser } from "./baseParser.js";
import { readText } from "../utils.js";

export class HTMLParser extends BaseParser {

    getSupportedExtensions() {

        return [".html", ".htm"];

    }

    async parse(file) {

        const html = await readText(file);

        let title = file.name;
        let text = html;

        /*
        DOMParser exists in browsers only — in Node tests we
        fall back to a tag-stripping projection.
        */
        if (typeof DOMParser !== "undefined") {

            const dom = new DOMParser().parseFromString(html, "text/html");

            title = dom.title || file.name;
            text = dom.body?.innerText ?? "";

        } else {

            const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

            if (match) title = match[1].trim();

            text = html
                .replace(/<head[\s\S]*?<\/head>/gi, "")
                .replace(/<script[\s\S]*?<\/script>/gi, "")
                .replace(/<style[\s\S]*?<\/style>/gi, "")
                .replace(/<[^>]+>/g, "\n")
                .replace(/&nbsp;/g, " ")
                .replace(/&amp;/g, "&")
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/\n{3,}/g, "\n\n")
                .trim();

        }

        return this.createRawDocument({

            title,
            format: "html",
            pages: [{ pageNumber: 1, html, text }],
            metadata: {
                type: "html",
                name: file.name,
                fileSize: file.size
            }

        });

    }

}
