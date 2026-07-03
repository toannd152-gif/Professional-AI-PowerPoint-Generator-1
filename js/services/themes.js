/**
 * Presentation Themes
 */

export const THEMES = [

    {
        id: "ocean",
        name: "Ocean",
        background: "#0f2a43",
        titleBackground: "#0b3d63",
        accent: "#38bdf8",
        title: "#ffffff",
        text: "#dbeafe",
        fontHead: "Arial",
        fontBody: "Arial"
    },

    {
        id: "light",
        name: "Minimal Light",
        background: "#ffffff",
        titleBackground: "#f1f5f9",
        accent: "#2563eb",
        title: "#111827",
        text: "#374151",
        fontHead: "Arial",
        fontBody: "Arial"
    },

    {
        id: "forest",
        name: "Forest",
        background: "#0d2818",
        titleBackground: "#14532d",
        accent: "#4ade80",
        title: "#f0fdf4",
        text: "#dcfce7",
        fontHead: "Arial",
        fontBody: "Arial"
    },

    {
        id: "sunset",
        name: "Sunset",
        background: "#431407",
        titleBackground: "#7c2d12",
        accent: "#fb923c",
        title: "#fff7ed",
        text: "#ffedd5",
        fontHead: "Arial",
        fontBody: "Arial"
    }

];

export function getTheme(id) {

    return THEMES.find(t => t.id === id) || THEMES[0];

}
