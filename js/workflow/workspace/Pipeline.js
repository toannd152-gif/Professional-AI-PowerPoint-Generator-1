/**
 * Pipeline
 *
 * Top-level orchestrator. A Pipeline is a sequence of Tasks,
 * each Task is a sequence of Stages.
 *
 * Standard pipeline for AI PPT generation:
 *
 *     Parser  →  Analyzer  →  Planner  →  Renderer  →  Exporter
 *
 * Pipelines emit events on the supplied EventBus and report
 * progress via a Progress instance.
 */

import { Progress } from "./Progress.js";
import { Task, TASK_STATUS } from "./Task.js";
import { STAGE_STATUS } from "./Stage.js";

export const PIPELINE_STATUS = Object.freeze({
    IDLE: "idle",
    RUNNING: "running",
    COMPLETED: "completed",
    FAILED: "failed",
    CANCELLED: "cancelled"
});

export class Pipeline {

    constructor(name, options = {}) {

        this.id = options.id || name;
        this.name = options.label || name;
        this.description = options.description || "";

        this.tasks = [];

        this.eventBus = options.eventBus || null;
        this.logger = options.logger || null;

        this.status = PIPELINE_STATUS.IDLE;

        this.progress = new Progress();
        this.context = options.context || {};
        this.startedAt = null;
        this.finishedAt = null;
        this.error = null;

    }

    /* ---------- composition ---------- */

    addTask(task) {

        if (!(task instanceof Task)) {

            throw new Error(`Pipeline "${this.id}": task must be a Task instance.`);

        }

        this.tasks.push(task);

        return this;

    }

    addTasks(...tasks) {

        for (const t of tasks) this.addTask(t);

        return this;

    }

    /* ---------- execution ---------- */

    async run(initialContext = {}) {

        if (this.status === PIPELINE_STATUS.RUNNING) {

            throw new Error(`Pipeline "${this.id}" is already running.`);

        }

        this.status = PIPELINE_STATUS.RUNNING;
        this.startedAt = Date.now();
        this.error = null;

        const context = { ...this.context, ...initialContext, pipeline: this };

        /*
        Keep the live reference — cancel() mutates this exact
        object, so the stage loop below sees the flag.
        */
        this.context = context;

        this._emit("pipeline:start", { pipelineId: this.id });

        const totalWeight = this.tasks.reduce(
            (sum, t) => sum + t.stages.reduce((s, st) => s + (st.weight || 1), 0),
            0
        );

        this.progress.reset(totalWeight);

        try {

            for (const task of this.tasks) {

                this._emit("pipeline:task:start", { pipelineId: this.id, taskId: task.id });

                for (const stage of task.stages) {

                    if (context.cancelled) {

                        task.status = TASK_STATUS.SKIPPED;
                        stage.status = STAGE_STATUS.SKIPPED;

                        continue;

                    }

                    this._emit("pipeline:stage:start", {
                        pipelineId: this.id,
                        taskId: task.id,
                        stageId: stage.id,
                        stageName: stage.name
                    });

                    try {

                        await stage.run(context);

                        this.progress.complete(stage.weight || 1);

                        this._emit("pipeline:stage:complete", {
                            pipelineId: this.id,
                            taskId: task.id,
                            stageId: stage.id,
                            result: stage.result,
                            duration: stage.duration()
                        });

                    } catch (error) {

                        this._emit("pipeline:stage:failed", {
                            pipelineId: this.id,
                            taskId: task.id,
                            stageId: stage.id,
                            error
                        });

                        throw error;

                    }

                }

                this._emit("pipeline:task:complete", { pipelineId: this.id, taskId: task.id });

            }

            this.status = PIPELINE_STATUS.COMPLETED;

            this._emit("pipeline:complete", { pipelineId: this.id });

        } catch (error) {

            this.status = PIPELINE_STATUS.FAILED;
            this.error = error;

            this._emit("pipeline:failed", { pipelineId: this.id, error });

            throw error;

        } finally {

            this.finishedAt = Date.now();

        }

        return context;

    }

    cancel() {

        this.context.cancelled = true;

        if (this.status === PIPELINE_STATUS.RUNNING) {

            this.status = PIPELINE_STATUS.CANCELLED;

        }

    }

    duration() {

        if (!this.startedAt || !this.finishedAt) return 0;

        return this.finishedAt - this.startedAt;

    }

    /* ---------- inspection ---------- */

    snapshot() {

        return {
            id: this.id,
            name: this.name,
            description: this.description,
            status: this.status,
            progress: this.progress.snapshot(),
            duration: this.duration(),
            tasks: this.tasks.map(t => t.toJSON()),
            error: this.error ? { message: this.error.message } : null,
            startedAt: this.startedAt,
            finishedAt: this.finishedAt
        };

    }

    /* ---------- internals ---------- */

    _emit(event, payload) {

        if (!this.eventBus) return;

        try {

            this.eventBus.emit(`workflow:${event}`, { ...payload, pipelineId: this.id });

        } catch (error) {

            this.logger?.warn?.("Pipeline event emit failed:", error);

        }

    }

}