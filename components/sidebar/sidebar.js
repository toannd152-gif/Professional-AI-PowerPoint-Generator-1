/**
 * Sidebar Component
 */

export class Sidebar {

    constructor(root, router, events) {

        this.root = root;
        this.router = router;
        this.events = events;

        this.items = [
            { id: "dashboard", icon: "🏠", title: "Dashboard" },
            { id: "upload", icon: "📄", title: "Upload" },
            { id: "analysis", icon: "🔍", title: "AI Analysis" },
            { id: "planner", icon: "🗂", title: "Slide Planner" },
            { id: "renderer", icon: "🖼", title: "Rendering" },
            { id: "validation", icon: "✅", title: "Validation" },
            { id: "export", icon: "📦", title: "Export" },
            { id: "settings", icon: "⚙️", title: "Settings" }
        ];

        this.events.on("router:navigate", ({ route }) => {
            this.setActive(route);
        });

    }

    render() {

        this.root.innerHTML = `
<div class="sidebar-header">
    <div class="sidebar-title">Navigation</div>
</div>

<nav class="sidebar-menu">
    ${this.items.map(item => `
    <div class="sidebar-item" data-route="${item.id}">
        <div class="sidebar-icon">${item.icon}</div>
        <div class="sidebar-text">${item.title}</div>
    </div>`).join("")}
</nav>`;

        this.root.querySelectorAll(".sidebar-item").forEach(item => {

            item.addEventListener("click", () => {

                this.router.navigate(item.dataset.route);

            });

        });

    }

    setActive(route) {

        this.root.querySelectorAll(".sidebar-item").forEach(item => {

            item.classList.toggle(
                "active",
                item.dataset.route === route
            );

        });

    }

}
