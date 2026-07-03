/*
================================================

AI PPT Generator — Application Entry

Boots the core layer (Bootstrap / ServiceContainer /
ModuleManager / PluginManager) and mounts all view
modules.

================================================
*/

import { Bootstrap } from "../core/Bootstrap.js";
import { ConfigManager } from "../core/services/ConfigManager.js";
import { HistoryManager } from "../core/services/HistoryManager.js";

import { Router } from "./router.js";
import { DocumentManager } from "./documentManager.js";
import { DocumentAnalyzer } from "./services/analyzer.js";
import { SlidePlanner } from "./services/slidePlanner.js";
import { PresentationValidator } from "./services/validator.js";
import { PptxExporter } from "./services/pptxExporter.js";

/* ---------- Domain Layer ---------- */

import { DocumentModelBuilder } from "./builders/documentModelBuilder.js";
import { KnowledgeBuilder } from "./builders/knowledgeBuilder.js";
import { PresentationBuilder } from "./builders/presentationBuilder.js";

/* ---------- Workflow Engine ---------- */

import { buildStandardPipeline } from "./workflow/index.js";

/* ---------- Sample Plugin ---------- */

import { WordCountPlugin } from "../core/plugins/index.js";

/* ---------- Components ---------- */

import { Header } from "../components/header/header.js";
import { Sidebar } from "../components/sidebar/sidebar.js";
import { Workspace } from "../components/workspace/workspace.js";
import { Inspector } from "../components/inspector/inspector.js";
import { Statusbar } from "../components/statusbar/statusbar.js";
import { Notification } from "../components/notification/notification.js";

/* ---------- Modules ---------- */

import { DashboardModule } from "../modules/dashboardModule.js";
import { DeveloperDashboardModule } from "../modules/developerDashboardModule.js";
import { UploadModule } from "../modules/uploadModule.js";
import { AnalysisModule } from "../modules/analysisModule.js";
import { PlannerModule } from "../modules/plannerModule.js";
import { RendererModule } from "../modules/rendererModule.js";
import { ValidationModule } from "../modules/validationModule.js";
import { ExportModule } from "../modules/exportModule.js";
import { SettingsModule } from "../modules/settingsModule.js";

class App {

    constructor() {

        /* ---------- Core bootstrap ---------- */

        this.bootstrap = new Bootstrap();
        this.bootstrap.initialize();

        const container = this.bootstrap.getContainer();

        this.logger = container.resolve("logger");
        this.events = container.resolve("eventBus");
        this.store = container.resolve("store");
        this.moduleManager = container.resolve("moduleManager");
        this.pluginManager = container.resolve("pluginManager");
        this.performanceMonitor = container.resolve("performanceMonitor");
        this.crashReporter = container.resolve("crashReporter");
        this.recoveryManager = container.resolve("recoveryManager");
        this.globalErrorHandler = container.resolve("globalErrorHandler");

        this.logger.info("AI PPT Generator starting...");

        /* ---------- Services ---------- */

        const config = new ConfigManager();
        config.load();

        const history = new HistoryManager();

        /* Domain Layer builders */

        const documentModelBuilder = new DocumentModelBuilder();
        const knowledgeBuilder = new KnowledgeBuilder();
        const presentationBuilder = new PresentationBuilder();

        const documentManager = new DocumentManager(this.store, this.events, this.logger, {
            documentModelBuilder,
            knowledgeBuilder,
            performanceMonitor: this.performanceMonitor
        });

        container.register("config", config);
        container.register("history", history);
        container.register("documentManager", documentManager);
        container.register("analyzer", new DocumentAnalyzer());
        container.register("planner", new SlidePlanner());
        container.register("validator", new PresentationValidator());
        container.register("pptx", new PptxExporter());
        container.register("documentModelBuilder", documentModelBuilder);
        container.register("knowledgeBuilder", knowledgeBuilder);
        container.register("presentationBuilder", presentationBuilder);

        /* ---------- Workflow engine ---------- */

        const pipeline = buildStandardPipeline({
            parserManager: documentManager.parserManager,
            documentModelBuilder,
            knowledgeBuilder,
            presentationBuilder,
            analyzer: container.resolve("analyzer"),
            planner: container.resolve("planner"),
            renderer: null,
            exporter: container.resolve("pptx"),
            eventBus: this.events,
            logger: this.logger
        });

        container.register("pipeline", pipeline);

        this.router = new Router(this.events);

        this.services = {
            config,
            history,
            documentManager,
            analyzer: container.resolve("analyzer"),
            planner: container.resolve("planner"),
            validator: container.resolve("validator"),
            pptx: container.resolve("pptx"),
            documentModelBuilder,
            knowledgeBuilder,
            presentationBuilder,
            pipeline,
            moduleManager: this.moduleManager,
            performanceMonitor: this.performanceMonitor,
            crashReporter: this.crashReporter,
            recoveryManager: this.recoveryManager,
            globalErrorHandler: this.globalErrorHandler,
            pluginManager: this.pluginManager
        };

        /* ---------- Components ---------- */

        this.header = new Header(document.getElementById("header"), this.store, this.events);
        this.sidebar = new Sidebar(document.getElementById("sidebar"), this.router, this.events);
        this.workspace = new Workspace(document.getElementById("workspace"));
        this.inspector = new Inspector(document.getElementById("inspector"), this.store, this.events);
        this.statusbar = new Statusbar(document.getElementById("statusbar"), this.store, this.events);
        this.notification = new Notification(document.getElementById("notification-root"), this.events);

        /* ---------- Modules ---------- */

        const ctx = {
            store: this.store,
            events: this.events,
            logger: this.logger,
            router: this.router,
            services: this.services
        };

        this.modules = {
            dashboard: { title: "Dashboard", instance: new DashboardModule(ctx) },
            developer: { title: "Developer Dashboard", instance: new DeveloperDashboardModule(ctx) },
            upload: { title: "Upload", instance: new UploadModule(ctx) },
            analysis: { title: "AI Analysis", instance: new AnalysisModule(ctx) },
            planner: { title: "Slide Planner", instance: new PlannerModule(ctx) },
            renderer: { title: "Rendering", instance: new RendererModule(ctx) },
            validation: { title: "Validation", instance: new ValidationModule(ctx) },
            export: { title: "Export", instance: new ExportModule(ctx) },
            settings: { title: "Settings", instance: new SettingsModule(ctx) }
        };

        for (const { instance } of Object.values(this.modules)) {

            this.moduleManager.register(instance);

        }

        /* ---------- Plugins ---------- */

        try {

            this.pluginManager.register(new WordCountPlugin());
            this.pluginManager.installAll().catch(() => {});
            this.pluginManager.activateAll().catch(() => {});

        } catch (error) {

            this.logger.warn("Plugin bootstrap warning:", error);

        }

        this.registerRoutes();

        this.bindEvents();

        /* ---------- Initial render ---------- */

        this.applyTheme(config.get("ui.theme") || "light");

        this.header.render();
        this.sidebar.render();
        this.workspace.render();
        this.inspector.render();
        this.statusbar.render();

        this.restoreProject();

        this.router.navigate("dashboard");

        window.APP = this;

        this.logger.info("Application Ready");

    }

    registerRoutes() {

        for (const [name, entry] of Object.entries(this.modules)) {

            this.router.register(name, (payload = {}) => {

                this.workspace.render();

                this.workspace.root.querySelector("#workspace-title").textContent = entry.title;

                const actions = this.workspace.root.querySelector("#workspace-actions");
                const content = this.workspace.root.querySelector("#workspace-content");

                entry.instance.render(content, actions, payload);

            });

        }

    }

    bindEvents() {

        /* Import from anywhere. */

        this.events.on("document:parsed", () => {

            this.services.history.clear();

            this.events.emit("history:changed", { canUndo: false, canRedo: false });

        });

        /* Slide updates from Inspector. */

        this.events.on("slide:update", ({ id, changes }) => {

            const slides = structuredClone(this.store.get("slides") || []);

            const slide = slides.find(s => s.id === id);

            if (!slide) return;

            Object.assign(slide, changes);

            this.store.set("slides", slides);

        });

        /* Undo / Redo */

        this.events.on("history:undo", () => {

            const snapshot = this.services.history.undo(this.store.get("slides") || []);

            if (snapshot) {

                this.store.set("slides", snapshot);

                this.rerenderCurrent();

            }

            this.emitHistoryState();

        });

        this.events.on("history:redo", () => {

            const snapshot = this.services.history.redo(this.store.get("slides") || []);

            if (snapshot) {

                this.store.set("slides", snapshot);

                this.rerenderCurrent();

            }

            this.emitHistoryState();

        });

        /* Save project to localStorage. */

        this.events.on("project:save", () => {

            try {

                localStorage.setItem("app-project", JSON.stringify({
                    project: this.store.get("project"),
                    slides: this.store.get("slides"),
                    analysis: this.store.get("analysis"),
                    theme: this.store.get("presentation.theme") || "ocean",
                    savedAt: new Date().toISOString()
                }));

                this.events.emit("notify", { type: "success", message: "Đã lưu dự án" });

                this.events.emit("status", "Dự án đã được lưu");

            } catch (error) {

                this.logger.error(error);

                this.events.emit("notify", { type: "error", message: "Không thể lưu dự án" });

            }

        });

        /* Global search -> filter planner. */

        this.events.on("search:query", query => {

            this.router.navigate("planner", { filter: query });

        });

        /* App theme switch. */

        this.events.on("ui:theme", theme => this.applyTheme(theme));

        /* Pipeline events → status / notify. */

        this.events.on("workflow:pipeline:start", () => {

            this.performanceMonitor.mark("pipeline:start");
            this.events.emit("status", "Pipeline bắt đầu...");

        });

        this.events.on("workflow:pipeline:stage:start", ({ stageName }) => {

            this.events.emit("status", `Đang chạy: ${stageName}`);

        });

        this.events.on("workflow:pipeline:complete", () => {

            const duration = this.performanceMonitor.measure("pipeline", "pipeline:start");
            this.events.emit("notify", {
                type: "success",
                message: `Pipeline hoàn tất (${Math.round(duration)}ms)`
            });

        });

        this.events.on("workflow:pipeline:failed", ({ error }) => {

            this.events.emit("notify", {
                type: "error",
                message: `Pipeline lỗi: ${error?.message || error}`
            });

        });

    }

    emitHistoryState() {

        this.events.emit("history:changed", {
            canUndo: this.services.history.canUndo(),
            canRedo: this.services.history.canRedo()
        });

    }

    rerenderCurrent() {

        const route = this.router.getCurrentRoute();

        if (route) this.router.navigate(route);

    }

    applyTheme(theme) {

        document.documentElement.dataset.theme = theme;

    }

    /**
     * Restore saved project (if any).
     */
    restoreProject() {

        try {

            const saved = localStorage.getItem("app-project");

            if (!saved) return;

            const data = JSON.parse(saved);

            if (data.project) this.store.set("project", data.project);
            if (data.slides?.length) this.store.set("slides", data.slides);
            if (data.analysis) this.store.set("analysis", data.analysis);
            if (data.theme) this.store.set("presentation.theme", data.theme);

            if (data.slides?.length) {

                this.events.emit("notify", {
                    type: "info",
                    message: `Đã khôi phục dự án "${data.project?.name || ""}" (${data.slides.length} slide)`
                });

            }

        } catch (error) {

            this.logger.warn("Cannot restore project:", error);

        }

    }

    /**
     * Run the full pipeline against a file.
     *
     *     Parser → DocumentModel → Knowledge → Presentation → PPTX
     */
    async runPipeline(file) {

        const pipeline = this.services.pipeline;

        pipeline.context.cancelled = false;

        try {

            const ctx = await pipeline.run({ file });

            /* legacy compatibility: surface results into store */

            if (ctx.documentModel) this.store.set("documentModel", ctx.documentModel.snapshot());
            if (ctx.knowledge)      this.store.set("knowledge", ctx.knowledge.snapshot());
            if (ctx.analysis)       this.store.set("analysis", ctx.analysis);
            if (ctx.slides)         this.store.set("slides", ctx.slides);
            if (ctx.presentation)   this.store.set("presentation", ctx.presentation.snapshot());
            if (ctx.export)         this.store.set("lastExport", ctx.export);

            return ctx;

        } catch (error) {

            this.logger.error("Pipeline failed:", error);

            throw error;

        }

    }

    /**
     * Public API
     */
    async importFile(file) {

        return await this.services.documentManager.import(file);

    }

}const app = new App();

export default app;