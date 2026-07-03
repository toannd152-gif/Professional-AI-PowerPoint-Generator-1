/**
 * HistoryManager
 * Undo / Redo stacks for slide plan snapshots.
 */

export class HistoryManager {

    constructor(limit = 50) {

        this.limit = limit;

        this.past = [];
        this.future = [];

    }

    push(snapshot) {

        this.past.push(structuredClone(snapshot));

        if (this.past.length > this.limit) {
            this.past.shift();
        }

        this.future = [];

    }

    undo(current) {

        if (!this.past.length) return null;

        this.future.push(structuredClone(current));

        return this.past.pop();

    }

    redo(current) {

        if (!this.future.length) return null;

        this.past.push(structuredClone(current));

        return this.future.pop();

    }

    canUndo() { return this.past.length > 0; }

    canRedo() { return this.future.length > 0; }

    clear() {

        this.past = [];
        this.future = [];

    }

}
