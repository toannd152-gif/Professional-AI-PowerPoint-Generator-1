/**
 * Workflow Engine — Public Entry Point
 *
 *     import {
 *         Pipeline, Task, Stage, Progress,
 *         buildStandardPipeline, buildCustomPipeline,
 *         PIPELINE_STATUS, TASK_STATUS, STAGE_STATUS
 *     } from "../js/workflow/index.js";
 *
 * The Workflow Engine is the orchestrator of the AI PPT
 * generation pipeline. It splits the work into Tasks
 * (Parse / Analyze / Plan / Render / Export) and each Task
 * is split into typed Stages. The engine reports weighted
 * progress and emits structured events on every transition.
 *
 * Reference: yêu cầu #7 in the architecture review.
 */

export {
    Pipeline, PIPELINE_STATUS
} from "./workspace/Pipeline.js";

export {
    Task, TASK_STATUS
} from "./workspace/Task.js";

export {
    Stage, STAGE_STATUS
} from "./workspace/Stage.js";

export {
    Progress
} from "./workspace/Progress.js";

import { Pipeline } from "./workspace/Pipeline.js";
import { Task }     from "./workspace/Task.js";
import { Stage }    from "./workspace/Stage.js";

/* ------------------------------------------------------------------ */
/*  Standard pipeline                                                  */
/* ------------------------------------------------------------------ */

/**
 * Build the standard AI PPT pipeline:
 *
 *     Parser  →  Analyzer  →  Planner  →  Renderer  →  Exporter
 *
 * Each stage is wired to the right builder/service so the
 * orchestration code doesn't have to know about the
 * individual implementations.
 */
export function buildStandardPipeline(deps, options = {}) {

    const {
        parserManager,
        documentModelBuilder,
        knowledgeBuilder,
        presentationBuilder,
        analyzer,         // legacy heuristic analyzer
        planner,          // legacy slide planner
        renderer,         // optional renderer
        exporter          // PPTX exporter
    } = deps;

    const pipeline = new Pipeline("ai-ppt", {
        label: "AI PPT Generation",
        description: "PDF → RawDocument → DocumentModel → Knowledge → Presentation",
        eventBus: deps.eventBus,
        logger: deps.logger,
        context: { cancelled: false }
    });

    /* ---------------- Task 1: PARSE ---------------- */

    const parseTask = new Task("parse", {
        label: "Parse document",
        description: "Convert uploaded file to a typed RawDocument"
    });

    parseTask.addStage(new Stage("raw", async (ctx) => {

        const raw = await parserManager.parse(ctx.file);

        ctx.raw = raw;

        return raw;

    }, { weight: 1, label: "Parse to RawDocument" }));

    parseTask.addStage(new Stage("document-model", async (ctx) => {

        const model = documentModelBuilder.build(ctx.raw);

        ctx.documentModel = model;

        return model;

    }, { weight: 1, label: "Build DocumentModel" }));

    pipeline.addTask(parseTask);

    /* ---------------- Task 2: ANALYZE ---------------- */

    const analyzeTask = new Task("analyze", {
        label: "AI analysis",
        description: "Extract knowledge layer from the document"
    });

    analyzeTask.addStage(new Stage("knowledge", async (ctx) => {

        const knowledge = knowledgeBuilder.build(ctx.documentModel, ctx.documentModel.title);

        ctx.knowledge = knowledge;

        /* legacy compatibility: keep the old analysis shape */

        if (analyzer?.analyze) {

            ctx.analysis = analyzer.analyze({
                title: ctx.documentModel.title,
                pages: [{ index: 0, content: ctx.documentModel.document.plainText() }]
            });

        }

        return knowledge;

    }, { weight: 2, label: "Build Knowledge" }));

    pipeline.addTask(analyzeTask);

    /* ---------------- Task 3: PLAN ---------------- */

    const planTask = new Task("plan", {
        label: "Plan slides",
        description: "Build the Presentation model from Knowledge + DocumentModel"
    });

    planTask.addStage(new Stage("presentation", async (ctx) => {

        const presentation = presentationBuilder.build({
            knowledge: ctx.knowledge,
            documentModel: ctx.documentModel,
            title: ctx.documentModel.title
        });

        ctx.presentation = presentation;

        return presentation;

    }, { weight: 1, label: "Build Presentation" }));

    planTask.addStage(new Stage("legacy-slides", async (ctx) => {

        if (!planner?.plan || !ctx.analysis) return null;

        const slides = planner.plan(ctx.analysis, options.plannerOptions || {});

        ctx.slides = slides;

        return slides;

    }, {
        weight: 1,
        label: "Legacy slide plan (compat)",
        optional: true
    }));

    pipeline.addTask(planTask);

    /* ---------------- Task 4: RENDER ---------------- */

    const renderTask = new Task("render", {
        label: "Render preview",
        description: "Optionally render HTML preview of slides"
    });

    renderTask.addStage(new Stage("render-preview", async (ctx) => {

        if (typeof renderer?.render !== "function") return null;

        return renderer.render(ctx.presentation);

    }, {
        weight: 1,
        label: "Render preview",
        optional: true
    }));

    pipeline.addTask(renderTask);

    /* ---------------- Task 5: EXPORT ---------------- */

    const exportTask = new Task("export", {
        label: "Export",
        description: "Produce downloadable artifacts"
    });

    exportTask.addStage(new Stage("pptx", async (ctx) => {

        if (!exporter?.build) return null;

        const presentation = ctx.presentation;

        const slides = presentation.slides.map(s => ({
            id: s.id,
            type: s.type,
            title: s.title,
            subtitle: s.subtitle,
            bullets: s.bullets,
            notes: s.notes,
            layout: s.layout
        }));

        const bytes = exporter.build(slides, { id: presentation.themeId }, {
            title: presentation.title,
            author: presentation.author
        });

        ctx.export = {
            format: "pptx",
            bytes,
            filename: `${presentation.title}.pptx`
        };

        return ctx.export;

    }, { weight: 1, label: "Build PPTX" }));

    pipeline.addTask(exportTask);

    return pipeline;

}

/* ------------------------------------------------------------------ */
/*  Custom pipeline — caller supplies task specs                       */
/* ------------------------------------------------------------------ */

/**
 * Build a custom pipeline from a list of task specs:
 *
 *     buildCustomPipeline(deps, [
 *         { id: "load",  label: "Load",    stages: [{ id: "stage1", handler: fn, weight: 2 }] },
 *         { id: "save",  label: "Persist", stages: [{ id: "stage1", handler: fn, weight: 1 }] }
 *     ]);
 */
export function buildCustomPipeline(deps, taskSpecs = [], pipelineOptions = {}) {

    const pipeline = new Pipeline(
        pipelineOptions.id || "custom",
        {
            label: pipelineOptions.label || "Custom Pipeline",
            description: pipelineOptions.description || "",
            eventBus: deps.eventBus,
            logger: deps.logger,
            context: pipelineOptions.context || { cancelled: false }
        }
    );

    for (const spec of taskSpecs) {

        const task = new Task(spec.id, {

            label: spec.label,
            description: spec.description

        });

        for (const stageSpec of spec.stages || []) {

            const stage = new Stage(stageSpec.id, stageSpec.handler, {

                label: stageSpec.label,
                description: stageSpec.description,
                weight: stageSpec.weight ?? 1,
                optional: stageSpec.optional ?? false,
                retryable: stageSpec.retryable ?? true,
                maxRetries: stageSpec.maxRetries ?? 0

            });

            task.addStage(stage);

        }

        pipeline.addTask(task);

    }

    return pipeline;

}