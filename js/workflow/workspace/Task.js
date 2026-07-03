/**
 * Task
 *
 * A Task groups one or more Stages and runs them in order.
 * Tasks are themselves composed into Pipelines.
 *
 * Tasks can have a parent Pipeline and a `name` to make
 * progress reporting easier.
 */

import { STAGE_STATUS } from "./Stage.js";

export const TASK_STATUS = Object.freeze({
    PENDING: "pending",
    RUNNING: "running",
    COMPLETED: "completed",
    FAILED: "failed",
    SKIPPED: "skipped"
});

export class Task {

    constructor(name, options = {}) {

        this.id = options.id || name;
        this.name = options.label || name;
        this.description = options.description || "";
        this.stages = [];

        this.status = TASK_STATUS.PENDING;
        this.error = null;
        this.startedAt = null;
        this.finishedAt = null;

    }

    /**
     * Add a Stage (or a plain { name, handler } pair).
     */
    addStage(stage) {

        if (!stage || typeof stage.run !== "function") {

            throw new Error(`Task "${this.id}": stage must be a Stage instance.`);

        }

        this.stages.push(stage);

        return this;

    }

    addStages(...stages) {

        for (const s of stages) this.addStage(s);

        return this;

    }

    /**
     * Run all stages sequentially. Stops on first failure
     * unless `continueOnError` is set.
     */
    async run(context, options = {}) {

        this.status = TASK_STATUS.RUNNING;
        this.startedAt = Date.now();
        this.error = null;

        const continueOnError = options.continueOnError ?? false;

        try {

            for (const stage of this.stages) {

                if (context?.shouldSkip?.(stage)) {

                    stage.status = STAGE_STATUS.SKIPPED;

                    continue;

                }

                try {

                    await stage.run(context);

                } catch (error) {

                    if (!continueOnError) throw error;

                }

            }

            this.status = TASK_STATUS.COMPLETED;

        } catch (error) {

            this.status = TASK_STATUS.FAILED;
            this.error = error;

            throw error;

        } finally {

            this.finishedAt = Date.now();

        }

    }

    duration() {

        if (!this.startedAt || !this.finishedAt) return 0;

        return this.finishedAt - this.startedAt;

    }

    progress() {

        if (this.stages.length === 0) return 1;

        const done = this.stages.filter(s => s.isComplete() || s.status === STAGE_STATUS.SKIPPED).length;

        return done / this.stages.length;

    }

    toJSON() {

        return {
            id: this.id,
            name: this.name,
            description: this.description,
            status: this.status,
            progress: this.progress(),
            duration: this.duration(),
            stageCount: this.stages.length,
            stages: this.stages.map(s => s.toJSON()),
            error: this.error ? { message: this.error.message } : null,
            startedAt: this.startedAt,
            finishedAt: this.finishedAt
        };

    }

}