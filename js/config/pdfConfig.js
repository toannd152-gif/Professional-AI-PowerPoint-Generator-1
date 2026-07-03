/*
================================================

PDF.js Configuration

================================================
*/

import * as pdfjsLib from "../../vendor/pdfjs/pdf.min.mjs";

/*
Resolve the worker URL relative to THIS module file,
so it works both with a static server and with Vite.
*/
pdfjsLib.GlobalWorkerOptions.workerSrc =
    new URL(
        "../../vendor/pdfjs/pdf.worker.min.mjs",
        import.meta.url
    ).href;

export default pdfjsLib;