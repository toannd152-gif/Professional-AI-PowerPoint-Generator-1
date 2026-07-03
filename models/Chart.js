/**
 * Chart
 *
 * Numerical / categorical visualization data. Rendering is
 * the consumer's responsibility (PPT shapes, Canvas, SVG...).
 *
 * Part of the Domain Layer (yêu cầu #3).
 */

import { BaseModel } from "./BaseModel.js";

export const CHART_TYPES = Object.freeze({
    BAR: "bar",
    COLUMN: "column",
    LINE: "line",
    PIE: "pie",
    DOUGHNUT: "doughnut",
    AREA: "area",
    SCATTER: "scatter",
    RADAR: "radar"
});

export class Chart extends BaseModel {

    constructor({
        id,
        type = "bar",
        title = "",
        labels = [],
        datasets = [],          // [{ name, values, color? }]
        caption = "",
        metadata = {}
    } = {}) {

        super(id);

        this.type = type;
        this.title = title;
        this.labels = labels;
        this.datasets = datasets;
        this.caption = caption;
        this.metadata = metadata;

    }

    /* ---------- Queries ---------- */

    isValidType() {

        return Object.values(CHART_TYPES).includes(this.type);

    }

    totalValue(datasetIndex = 0) {

        const dataset = this.datasets[datasetIndex];

        if (!dataset) return 0;

        return dataset.values.reduce((sum, v) => sum + (Number(v) || 0), 0);

    }

    maxValue(datasetIndex = 0) {

        const dataset = this.datasets[datasetIndex];

        if (!dataset) return 0;

        return Math.max(...dataset.values.map(v => Number(v) || 0));

    }

    minValue(datasetIndex = 0) {

        const dataset = this.datasets[datasetIndex];

        if (!dataset) return 0;

        return Math.min(...dataset.values.map(v => Number(v) || 0));

    }

    average(datasetIndex = 0) {

        const dataset = this.datasets[datasetIndex];

        if (!dataset || dataset.values.length === 0) return 0;

        return this.totalValue(datasetIndex) / dataset.values.length;

    }

    /* ---------- Mutators ---------- */

    addDataset(dataset) {

        this.datasets.push(dataset);

        this.touch();

    }

    setLabels(labels) {

        this.labels = [...labels];

        this.touch();

    }

    /* ---------- Validation ---------- */

    validate() {

        if (!this.isValidType()) return false;

        if (!Array.isArray(this.labels)) return false;

        if (!Array.isArray(this.datasets)) return false;

        if (this.datasets.length === 0) return false;

        return true;

    }

    /* ---------- Persistence ---------- */

    toJSON() {

        return {
            id: this.id,
            type: this.type,
            title: this.title,
            labels: this.labels,
            datasets: this.datasets,
            caption: this.caption,
            metadata: this.metadata,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };

    }

    static fromJSON(data = {}) {

        return new Chart({

            id: data.id,
            type: data.type || "bar",
            title: data.title || "",
            labels: Array.isArray(data.labels) ? [...data.labels] : [],
            datasets: Array.isArray(data.datasets)
                ? data.datasets.map(d => ({ ...d, values: [...(d.values || [])] }))
                : [],
            caption: data.caption || "",
            metadata: data.metadata || {}

        });

    }

}