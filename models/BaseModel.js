/**
 * BaseModel
 * Base class for all domain models.
 */

export class BaseModel {

    constructor(id = crypto.randomUUID()) {

        this.id = id;

        this.createdAt = new Date();

        this.updatedAt = new Date();

        this.metadata = {};

    }

    getId() {

        return this.id;

    }

    setMetadata(key, value) {

        this.metadata[key] = value;

        this.touch();

    }

    getMetadata(key) {

        return this.metadata[key];

    }

    touch() {

        this.updatedAt = new Date();

    }

    serialize() {

        return structuredClone(this);

    }

    clone() {

        return structuredClone(this);

    }

    validate() {

        return true;

    }

}