/**
 * Table
 *
 * Structured tabular data — either extracted from a document
 * or authored for a slide.
 *
 * Part of the Domain Layer (yêu cầu #3).
 */

import { BaseModel } from "./BaseModel.js";

export class Table extends BaseModel {

    constructor({
        id,
        headers = [],
        rows = [],
        caption = "",
        metadata = {}
    } = {}) {

        super(id);

        this.headers = headers;
        this.rows = rows;
        this.caption = caption;
        this.metadata = metadata;

    }

    /* ---------- Queries ---------- */

    get columnCount() {

        return this.headers.length;

    }

    get rowCount() {

        return this.rows.length;

    }

    isEmpty() {

        return this.headers.length === 0 && this.rows.length === 0;

    }

    /* ---------- Mutators ---------- */

    addRow(row) {

        this.rows.push(row);

        this.touch();

    }

    addColumn(header, values = []) {

        this.headers.push(header);

        for (let i = 0; i < values.length; i += 1) {

            const row = this.rows[i] || (this.rows[i] = []);

            row.push(values[i]);

        }

        this.touch();

    }

    removeRow(rowIndex) {

        if (rowIndex < 0 || rowIndex >= this.rows.length) return false;

        this.rows.splice(rowIndex, 1);

        this.touch();

        return true;

    }

    cellAt(rowIndex, columnIndex) {

        const row = this.rows[rowIndex];

        if (!row) return null;

        return row[columnIndex] ?? null;

    }

    /* ---------- Serialization ---------- */

    toCSV() {

        const head = this.headers.join(",");

        const body = this.rows
            .map(r => r.map(v => {
                const s = String(v ?? "");
                return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
            }).join(","))
            .join("\n");

        return `${head}\n${body}`;

    }

    toMarkdown() {

        if (this.headers.length === 0) return "";

        const sep = this.headers.map(() => "---").join(" | ");

        const body = this.rows.map(r => r.join(" | ")).join("\n");

        return `| ${this.headers.join(" | ")} |\n| ${sep} |\n| ${body} |`;

    }

    /* ---------- Validation ---------- */

    validate() {

        if (!Array.isArray(this.headers)) return false;

        if (!Array.isArray(this.rows)) return false;

        if (this.headers.length === 0 && this.rows.length === 0) return false;

        return true;

    }

    /* ---------- Persistence ---------- */

    toJSON() {

        return {
            id: this.id,
            headers: this.headers,
            rows: this.rows,
            caption: this.caption,
            rowCount: this.rowCount,
            columnCount: this.columnCount,
            metadata: this.metadata,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };

    }

    static fromJSON(data = {}) {

        return new Table({

            id: data.id,
            headers: Array.isArray(data.headers) ? [...data.headers] : [],
            rows: Array.isArray(data.rows) ? data.rows.map(r => [...r]) : [],
            caption: data.caption || "",
            metadata: data.metadata || {}

        });

    }

}