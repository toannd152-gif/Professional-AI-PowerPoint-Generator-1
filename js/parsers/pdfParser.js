/*
================================================

PDF Parser  →  RawDocument (format: "pdf")

Browser-only (pdf.js). Loaded lazily by ParserManager so the
Node test suite never touches it.

================================================
*/

import pdfjsLib from "../config/pdfConfig.js";
import { readArrayBuffer } from "./pdfUtils.js";
import { RawDocument } from "../../models/RawDocument.js";

export class PDFParser {

    async parse(file, { onProgress = null } = {}) {

        const buffer = await readArrayBuffer(file);

        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

        const pages = [];

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {

            onProgress?.({ pageNumber, totalPages: pdf.numPages });

            const page = await pdf.getPage(pageNumber);

            const textContent = await page.getTextContent();

            const text = textContent.items
                .map(item => item.str)
                .join(" ");

            pages.push({ pageNumber, text });

        }

        /* PDF metadata (title, author) when available. */

        let info = {};

        try {

            info = (await pdf.getMetadata())?.info || {};

        } catch { /* metadata is optional */ }

        return new RawDocument({

            title: info.Title || file.name,
            format: "pdf",
            pages,
            metadata: {
                type: "pdf",
                fileName: file.name,
                fileSize: file.size,
                totalPages: pdf.numPages,
                author: info.Author || null,
                producer: info.Producer || null
            }

        });

    }

}
