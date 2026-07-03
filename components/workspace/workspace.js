/**
 * Workspace Shell
 * Hosts the active module: toolbar (title + actions) + content area.
 */

export class Workspace {

    constructor(root) {

        this.root = root;

        this.current = null;

    }

    render() {

        this.root.innerHTML = `
<div id="workspace-toolbar">
    <div class="workspace-title" id="workspace-title">Workspace</div>
    <div class="workspace-actions" id="workspace-actions"></div>
</div>
<div id="workspace-content"></div>`;

    }

    /**
     * Mount a module view.
     */
    mount(title, module) {

        this.current = module;

        this.root.querySelector("#workspace-title").textContent = title;

        const actions = this.root.querySelector("#workspace-actions");
        const content = this.root.querySelector("#workspace-content");

        actions.innerHTML = "";
        content.innerHTML = "";

        module.render(content, actions);

    }

    getContent() {

        return this.root.querySelector("#workspace-content");

    }

}
