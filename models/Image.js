/**
 * Image
 *
 * Represents an image asset extracted from a document or
 * embedded into a slide. Format-agnostic — carries a generic
 * `src` (URL / data-URL / Blob / file path) plus optional
 * intrinsic dimensions.
 *
 * Part of the Domain Layer (yêu cầu #3).
 */

import { BaseModel } from "./BaseModel.js";

export class Image extends BaseModel {

    constructor({
        id,
        src = null,           // URL / data-URL / file path / Blob
        mimeType = "image/png",
        width = null,
        height = null,
        alt = "",
        caption = "",
        source = "unknown",   // "pdf" | "user" | "asset" | "generated"
        metadata = {}
    } = {}) {

        super(id);

        this.src = src;
        this.mimeType = mimeType;
        this.width = width;
        this.height = height;
        this.alt = alt;
        this.caption = caption;
        this.source = source;
        this.metadata = metadata;

    }

    /* ---------- Queries ---------- */

    hasSource() {

        return !!this.src;

    }

    isVector() {

        return /svg/i.test(this.mimeType);

    }

    aspectRatio() {

        if (!this.width || !this.height) return null;

        return this.width / this.height;

    }

    isLandscape() {

        const r = this.aspectRatio();

        return r != null && r > 1;

    }

    isPortrait() {

        const r = this.aspectRatio();

        return r != null && r < 1;

    }

    /* ---------- Mutators ---------- */

    setSource(src, mimeType = null) {

        this.src = src;

        if (mimeType) this.mimeType = mimeType;

        this.touch();

    }

    setDimensions(width, height) {

        this.width = width;
        this.height = height;

        this.touch();

    }

    setCaption(caption) {

        this.caption = caption;

        this.touch();

    }

    /* ---------- Validation ---------- */

    validate() {

        if (!this.src) return false;

        if (typeof this.src !== "string" && !(this.src instanceof Blob)) return false;

        return true;

    }

    /* ---------- Persistence ---------- */

    toJSON() {

        return {
            id: this.id,
            src: this.src instanceof Blob ? null : this.src,
            mimeType: this.mimeType,
            width: this.width,
            height: this.height,
            alt: this.alt,
            caption: this.caption,
            source: this.source,
            aspectRatio: this.aspectRatio(),
            isVector: this.isVector(),
            metadata: this.metadata,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };

    }

    static fromJSON(data = {}) {

        return new Image({

            id: data.id,
            src: data.src,
            mimeType: data.mimeType,
            width: data.width,
            height: data.height,
            alt: data.alt,
            caption: data.caption,
            source: data.source,
            metadata: data.metadata || {}

        });

    }

}
