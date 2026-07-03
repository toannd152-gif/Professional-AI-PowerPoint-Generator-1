/**
 * Progress
 *
 * Tracks the weighted progress of a Pipeline.
 *
 * Progress is the sum of:
 *   (weight of completed stages) / (sum of all stage weights)
 *
 * This lets one stage be heavier than another without
 * distorting the progress bar.
 */

export class Progress {

    constructor() {

        this.totalWeight = 0;
        this.completedWeight = 0;

        this.lastUpdatedAt = Date.now();
        this.subscribers = new Set();

    }

    reset(totalWeight = 0) {

        this.totalWeight = totalWeight;
        this.completedWeight = 0;

        this.lastUpdatedAt = Date.now();

        this._emit();

    }

    add(stageWeight = 1) {

        this.totalWeight += stageWeight;

        this._emit();

    }

    complete(stageWeight = 1) {

        this.completedWeight += stageWeight;

        if (this.completedWeight > this.totalWeight) {

            this.completedWeight = this.totalWeight;

        }

        this.lastUpdatedAt = Date.now();

        this._emit();

    }

    /**
     * 0..1
     */
    ratio() {

        if (this.totalWeight === 0) return 0;

        return this.completedWeight / this.totalWeight;

    }

    /**
     * 0..100
     */
    percent() {

        return Math.round(this.ratio() * 100);

    }

    subscribe(callback) {

        this.subscribers.add(callback);

        try { callback(this.snapshot()); } catch {}

        return () => this.subscribers.delete(callback);

    }

    _emit() {

        const snap = this.snapshot();

        for (const cb of this.subscribers) {

            try { cb(snap); } catch {}

        }

    }

    snapshot() {

        return {
            ratio: this.ratio(),
            percent: this.percent(),
            completedWeight: this.completedWeight,
            totalWeight: this.totalWeight,
            lastUpdatedAt: this.lastUpdatedAt
        };

    }

}