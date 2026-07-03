/**
 * Notification Component (toasts)
 */

export class Notification {

    constructor(root, events) {

        this.root = root;
        this.events = events;

        this.events.on("notify", payload => this.show(payload));

    }

    show({ type = "info", message = "" }) {

        const toast = document.createElement("div");

        toast.className = `toast toast-${type}`;

        const icons = {
            success: "✔",
            error: "✖",
            warning: "⚠",
            info: "ℹ"
        };

        toast.innerHTML = `
<span class="toast-icon">${icons[type] || icons.info}</span>
<span class="toast-message"></span>`;

        toast.querySelector(".toast-message").textContent = message;

        this.root.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add("visible"));

        setTimeout(() => {

            toast.classList.remove("visible");

            setTimeout(() => toast.remove(), 300);

        }, 3200);

    }

}
