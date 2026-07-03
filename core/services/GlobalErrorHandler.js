/**
 * GlobalErrorHandler
 *
 * Wraps the CrashReporter + RecoveryManager in a single
 * facade. App code can do:
 *
 *     globalErrorHandler.run("parse", () => parser.parse(file), { file });
 *
 * to get a fully recovered error-handling pipeline.
 *
 * Also installs itself as the global window error handler.
 */

export class GlobalErrorHandler {

    constructor({
        logger = null,
        crashReporter = null,
        recoveryManager = null,
        eventBus = null
    } = {}) {

        this.logger = logger;
        this.crashReporter = crashReporter;
        this.recoveryManager = recoveryManager;
        this.eventBus = eventBus;

        this.installed = false;

    }

    install() {

        if (this.installed) return;

        this.crashReporter?.install?.();

        this.installed = true;

        this.logger?.info?.("[GlobalErrorHandler] installed");

    }

    /**
     * Run an operation safely. Captures errors, reports them,
     * and runs fallbacks if any are registered.
     */
    async run(operation, fn, context = {}) {

        try {

            return await fn();

        } catch (error) {

            this.crashReporter?.breadcrumb?.(`error in ${operation}: ${error?.message}`, "error");

            this.crashReporter?.report?.(error, {
                source: "global-error-handler",
                context: { operation, ...context }
            });

            this.eventBus?.emit?.("error", { operation, error });

            if (this.recoveryManager) {

                return this.recoveryManager.withRecovery(operation, () => {
                    throw error;
                }, context);

            }

            throw error;

        }

    }

    /**
     * Convenience for retrying an operation.
     */
    retry(operation, fn, options = {}) {

        if (!this.recoveryManager) {

            return fn();

        }

        return this.recoveryManager.retry(fn, options);

    }

    addFallback(operation, handler) {

        this.recoveryManager?.registerFallback(operation, handler);

    }

}
