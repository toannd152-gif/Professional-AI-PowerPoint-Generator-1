/**
 * Stage
 *
 * A single named step in a Pipeline. Each Stage wraps one
 * operation (parse, analyze, plan, render, export, ...)
 * and reports progress + result back to the pipeline.
 */

export const STAGE_STATUS = Object.freeze({
    PENDING: "pending",
    RUNNING: "running",
    COMPLETED: "completed",
    FAILED: "failed",
    SKIPPED: "skipped"
});

export class Stage {

    /**
     * @param {string} name           — unique id within the pipeline
     * @param {Function} handler      — async (context) => result
     * @param {object} [options]
     */
    constructor(name, handler, options = {}) {

        this.id = name;
        this.name = options.label || name;
        this.description = options.description || "";
        this.handler = handler;
        this.weight = options.weight ?? 1;

        this.status = STAGE_STATUS.PENDING;
        this.result = null;
        this.error = null;

        this.startedAt = null;
        this.finishedAt = null;

        this.optional = options.optional ?? false;
        this.retryable = options.retryable ?? true;
        this.maxRetries = options.maxRetries ?? 0;

    }

    /**
     * Run the stage. Returns a result on success, throws on
     * non-recoverable failure.
     */
    async run(context) {

        if (typeof this.handler !== "function") {

            throw new Error(`Stage "${this.id}" has no handler.`);

        }

        this.status = STAGE_STATUS.RUNNING;
        this.startedAt = Date.now();

        try {

            const result = await this.handler(context);

            this.result = result;
            this.status = STAGE_STATUS.COMPLETED;

            return result;

        } catch (error) {

            this.error = error;

            if (!this.optional) {

                this.status = STAGE_STATUS.FAILED;

                throw error;

            }

            this.status = STAGE_STATUS.SKIPPED;

            return null;

        } finally {

            this.finishedAt = Date.now();

        }

    }

    duration() {

        if (!this.startedAt || !this.finishedAt) return 0;

        return this.finishedAt - this.startedAt;

    }

    isComplete() {

        return this.status === STAGE_STATUS.COMPLETED;

    }

    isFailed() {

        return this.status === STAGE_STATUS.FAILED;

    }

    toJSON() {

        return {
            id: this.id,
            name: this.name,
            description: this.description,
            status: this.status,
            weight: this.weight,
            duration: this.duration(),
            error: this.error ? { message: this.error.message, stack: this.error.stack } : null,
            startedAt: this.startedAt,
            finishedAt: this.finishedAt
        };

    }

}