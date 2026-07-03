/**
 * HTML / JSON exporters + download helper.
 */

function esc(text) {
    return String(text ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

export function exportJSON(project) {

    const json = JSON.stringify(project, null, 2);

    return new Blob([json], { type: "application/json" });

}

export function exportHTML(slides, theme, title = "Presentation") {

    const slideHtml = slides.map((slide, i) => {

        const isTitle = slide.type === "title";

        const bullets = (slide.bullets || [])
            .map(b => `<li>${esc(b)}</li>`)
            .join("\n");

        return `
<section class="slide ${isTitle ? "slide-title" : ""}">
  <div class="inner">
    <div class="bar"></div>
    <h1>${esc(slide.title)}</h1>
    ${slide.subtitle ? `<p class="subtitle">${esc(slide.subtitle)}</p>` : ""}
    ${bullets ? `<ul>${bullets}</ul>` : ""}
    <div class="num">${i + 1} / ${slides.length}</div>
  </div>
</section>`;

    }).join("\n");

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>${esc(title)}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:${theme.fontBody}, Arial, sans-serif; background:#111; }
  .slide {
    width:100vw; height:100vh;
    background:${theme.background};
    color:${theme.text};
    display:flex; align-items:center;
    scroll-snap-align:start;
  }
  .slide-title { background:${theme.titleBackground}; }
  html { scroll-snap-type:y mandatory; }
  .inner { width:100%; max-width:1100px; margin:0 auto; padding:60px; position:relative; }
  .bar { width:120px; height:6px; background:${theme.accent}; margin-bottom:24px; }
  h1 { color:${theme.title}; font-size:52px; margin-bottom:16px; font-family:${theme.fontHead}, Arial, sans-serif; }
  .subtitle { font-size:22px; opacity:.85; margin-bottom:24px; }
  ul { list-style:none; }
  li { font-size:26px; line-height:1.6; padding-left:28px; position:relative; margin-bottom:10px; }
  li::before { content:"•"; color:${theme.accent}; position:absolute; left:0; }
  .num { position:absolute; right:60px; bottom:20px; font-size:14px; opacity:.5; }
</style>
</head>
<body>
${slideHtml}
</body>
</html>`;

    return new Blob([html], { type: "text/html" });

}

export function download(blob, filename) {

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 5000);

}
