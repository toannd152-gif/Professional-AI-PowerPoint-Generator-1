/**
 * Bootstrap
 *
 * Initializes the application core: Logger, EventBus, Store,
 * ModuleManager, ServiceContainer and the cross-cutting
 * services that the Domain Layer relies on:
 *
 *   - PerformanceMonitor
 *   - CrashReporter
 *   - RecoveryManager
 *   - GlobalErrorHandler
 *   - PluginManager
 *
 * This is the single source of truth for app initialization.
 * Every test, the integration pipeline, and `js/app.js` go
 * through here.
 */

import { Logger, LogLevel } from "../Logger.js";
import { EventBus } from "../EventBus.js";
import { Store } from "../Store.js";
import { ServiceContainer } from "../ServiceContainer.js";
import { ModuleManager } from "../ModuleManager.js";

import { PerformanceMonitor } from "./PerformanceMonitor.js";
import { CrashReporter } from "./CrashReporter.js";
import { RecoveryManager } from "./RecoveryManager.js";
import { GlobalErrorHandler } from "./GlobalErrorHandler.js";
import { PluginManager } from "../plugins/PluginManager.js";

export class Bootstrap {

    constructor() {

        this.container = new ServiceContainer();

        this.moduleManager = null;
        this.pluginManager = null;

    }

    initialize() {

        /* ---------------- Logger ---------------- */

        const logger = new Logger(LogLevel.DEBUG);

        /* ---------------- EventBus ---------------- */

        const eventBus = new EventBus(logger);

        /* ---------------- Store ---------------- */

        const store = new Store(eventBus, logger);

        /* ---------------- ModuleManager ---------------- */

        const moduleManager = new ModuleManager(logger);

        /* ---------------- PerformanceMonitor ---------------- */

        const performanceMonitor = new PerformanceMonitor({ logger, eventBus });

        /* ---------------- CrashReporter ---------------- */

        const crashReporter = new CrashReporter({
            logger,
            eventBus,
            store,
            performanceMonitor
        });

        crashReporter.breadcrumb("bootstrap:start");

        /* ---------------- RecoveryManager ---------------- */

        const recoveryManager = new RecoveryManager({ logger });

        /* ---------------- GlobalErrorHandler ---------------- */

        const globalErrorHandler = new GlobalErrorHandler({
            logger,
            crashReporter,
            recoveryManager,
            eventBus
        });

        globalErrorHandler.install();

        /* ---------------- PluginManager ---------------- */

        const pluginManager = new PluginManager({
            services: this.container,
            logger,
            eventBus,
            store
        });

        /* ---------------- Register services ---------------- */

        this.container.register("logger", logger);
        this.container.register("eventBus", eventBus);
        this.container.register("store", store);
        this.container.register("moduleManager", moduleManager);
        this.container.register("performanceMonitor", performanceMonitor);
        this.container.register("crashReporter", crashReporter);
        this.container.register("recoveryManager", recoveryManager);
        this.container.register("globalErrorHandler", globalErrorHandler);
        this.container.register("pluginManager", pluginManager);

        this.moduleManager = moduleManager;
        this.pluginManager = pluginManager;

        logger.info("Bootstrap initialized.");

    }

    getContainer() {

        return this.container;

    }

    getModuleManager() {

        return this.moduleManager;

    }

    getPluginManager() {

        return this.pluginManager;

    }

}
