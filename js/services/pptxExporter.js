/**
 * PptxExporter
 * Generates a valid .pptx (OOXML) file from the slide plan,
 * with no external libraries. 16:9 (12192000 x 6858000 EMU).
 */

import { ZipWriter } from "./zipWriter.js";

const XMLNS = {
    a: "http://schemas.openxmlformats.org/drawingml/2006/main",
    p: "http://schemas.openxmlformats.org/presentationml/2006/main",
    r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
};

function esc(text) {

    return String(text ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&apos;");

}

function hex(color) {

    return String(color).replace("#", "").toUpperCase();

}

export class PptxExporter {

    /**
     * Build pptx -> Uint8Array
     */
    build(slides, theme, meta = {}) {

        const zip = new ZipWriter();

        const count = slides.length;

        zip.addText("[Content_Types].xml", this.contentTypes(count));

        zip.addText("_rels/.rels", this.rootRels());

        zip.addText("docProps/core.xml", this.coreProps(meta));

        zip.addText("docProps/app.xml", this.appProps(count));

        zip.addText("ppt/presentation.xml", this.presentation(count));

        zip.addText("ppt/_rels/presentation.xml.rels", this.presentationRels(count));

        zip.addText("ppt/theme/theme1.xml", this.themeXml(theme));

        zip.addText("ppt/slideMasters/slideMaster1.xml", this.slideMaster(theme));

        zip.addText(
            "ppt/slideMasters/_rels/slideMaster1.xml.rels",
            `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`
        );

        zip.addText("ppt/slideLayouts/slideLayout1.xml", this.slideLayout());

        zip.addText(
            "ppt/slideLayouts/_rels/slideLayout1.xml.rels",
            `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`
        );

        slides.forEach((slide, i) => {

            const n = i + 1;

            zip.addText(`ppt/slides/slide${n}.xml`, this.slideXml(slide, theme));

            zip.addText(
                `ppt/slides/_rels/slide${n}.xml.rels`,
                `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`
            );

        });

        return zip.build();

    }

    contentTypes(count) {

        const slides = Array.from({ length: count }, (_, i) =>
            `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
        ).join("\n");

        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
${slides}
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

    }

    rootRels() {

        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

    }

    coreProps(meta) {

        const now = new Date().toISOString();

        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${esc(meta.title || "Presentation")}</dc:title>
<dc:creator>${esc(meta.author || "AI PPT Generator")}</dc:creator>
<cp:lastModifiedBy>${esc(meta.author || "AI PPT Generator")}</cp:lastModifiedBy>
<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
<dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;

    }

    appProps(count) {

        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
<Application>AI PPT Generator</Application>
<Slides>${count}</Slides>
</Properties>`;

    }

    presentation(count) {

        const ids = Array.from({ length: count }, (_, i) =>
            `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`
        ).join("");

        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="${XMLNS.a}" xmlns:p="${XMLNS.p}" xmlns:r="${XMLNS.r}">
<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
<p:sldIdLst>${ids}</p:sldIdLst>
<p:sldSz cx="12192000" cy="6858000"/>
<p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`;

    }

    presentationRels(count) {

        const slides = Array.from({ length: count }, (_, i) =>
            `<Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`
        ).join("\n");

        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
${slides}
<Relationship Id="rId${count + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
</Relationships>`;

    }

    themeXml(theme) {

        const accent = hex(theme.accent);

        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="${XMLNS.a}" name="AppTheme">
<a:themeElements>
<a:clrScheme name="App">
<a:dk1><a:srgbClr val="000000"/></a:dk1>
<a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
<a:dk2><a:srgbClr val="${hex(theme.background)}"/></a:dk2>
<a:lt2><a:srgbClr val="${hex(theme.text)}"/></a:lt2>
<a:accent1><a:srgbClr val="${accent}"/></a:accent1>
<a:accent2><a:srgbClr val="${accent}"/></a:accent2>
<a:accent3><a:srgbClr val="${accent}"/></a:accent3>
<a:accent4><a:srgbClr val="${accent}"/></a:accent4>
<a:accent5><a:srgbClr val="${accent}"/></a:accent5>
<a:accent6><a:srgbClr val="${accent}"/></a:accent6>
<a:hlink><a:srgbClr val="${accent}"/></a:hlink>
<a:folHlink><a:srgbClr val="${accent}"/></a:folHlink>
</a:clrScheme>
<a:fontScheme name="App">
<a:majorFont><a:latin typeface="${esc(theme.fontHead)}"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>
<a:minorFont><a:latin typeface="${esc(theme.fontBody)}"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont>
</a:fontScheme>
<a:fmtScheme name="App">
<a:fillStyleLst>
<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
</a:fillStyleLst>
<a:lnStyleLst>
<a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
<a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
<a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
</a:lnStyleLst>
<a:effectStyleLst>
<a:effectStyle><a:effectLst/></a:effectStyle>
<a:effectStyle><a:effectLst/></a:effectStyle>
<a:effectStyle><a:effectLst/></a:effectStyle>
</a:effectStyleLst>
<a:bgFillStyleLst>
<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
</a:bgFillStyleLst>
</a:fmtScheme>
</a:themeElements>
</a:theme>`;

    }

    slideMaster(theme) {

        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="${XMLNS.a}" xmlns:p="${XMLNS.p}" xmlns:r="${XMLNS.r}">
<p:cSld>
<p:bg><p:bgPr><a:solidFill><a:srgbClr val="${hex(theme.background)}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
<p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
</p:spTree>
</p:cSld>
<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
</p:sldMaster>`;

    }

    slideLayout() {

        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="${XMLNS.a}" xmlns:p="${XMLNS.p}" xmlns:r="${XMLNS.r}" type="blank">
<p:cSld name="Blank">
<p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
</p:spTree>
</p:cSld>
<p:clrMapOvr><a:overrideClrMapping bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/></p:clrMapOvr>
</p:sldLayout>`;

    }

    /**
     * One slide.
     */
    slideXml(slide, theme) {

        const isTitle = slide.type === "title";

        const shapes = [];

        let shapeId = 2;

        /*
        Accent bar
        */
        shapes.push(`
<p:sp>
<p:nvSpPr><p:cNvPr id="${shapeId++}" name="Accent"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
<p:spPr>
<a:xfrm><a:off x="838200" y="${isTitle ? 3200400 : 1371600}"/><a:ext cx="1524000" cy="76200"/></a:xfrm>
<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
<a:solidFill><a:srgbClr val="${hex(theme.accent)}"/></a:solidFill>
<a:ln><a:noFill/></a:ln>
</p:spPr>
<p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody>
</p:sp>`);

        /*
        Title
        */
        shapes.push(`
<p:sp>
<p:nvSpPr><p:cNvPr id="${shapeId++}" name="Title"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
<p:spPr>
<a:xfrm><a:off x="838200" y="${isTitle ? 2133600 : 457200}"/><a:ext cx="10515600" cy="${isTitle ? 1066800 : 838200}"/></a:xfrm>
<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
</p:spPr>
<p:txBody>
<a:bodyPr wrap="square" anchor="b"><a:normAutofit/></a:bodyPr>
<a:lstStyle/>
<a:p>
<a:pPr algn="l"/>
<a:r>
<a:rPr lang="vi-VN" sz="${isTitle ? 4000 : 3000}" b="1" dirty="0">
<a:solidFill><a:srgbClr val="${hex(theme.title)}"/></a:solidFill>
<a:latin typeface="${esc(theme.fontHead)}"/>
</a:rPr>
<a:t>${esc(slide.title)}</a:t>
</a:r>
</a:p>
</p:txBody>
</p:sp>`);

        /*
        Subtitle
        */
        if (slide.subtitle) {

            shapes.push(`
<p:sp>
<p:nvSpPr><p:cNvPr id="${shapeId++}" name="Subtitle"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
<p:spPr>
<a:xfrm><a:off x="838200" y="${isTitle ? 3505200 : 1524000}"/><a:ext cx="10515600" cy="609600"/></a:xfrm>
<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
</p:spPr>
<p:txBody>
<a:bodyPr wrap="square"><a:normAutofit/></a:bodyPr>
<a:lstStyle/>
<a:p>
<a:r>
<a:rPr lang="vi-VN" sz="1800" dirty="0">
<a:solidFill><a:srgbClr val="${hex(theme.text)}"/></a:solidFill>
<a:latin typeface="${esc(theme.fontBody)}"/>
</a:rPr>
<a:t>${esc(slide.subtitle)}</a:t>
</a:r>
</a:p>
</p:txBody>
</p:sp>`);

        }

        /*
        Bullets
        */
        if (slide.bullets && slide.bullets.length) {

            const paragraphs = slide.bullets.map(b => `
<a:p>
<a:pPr marL="342900" indent="-342900">
<a:buFont typeface="Arial"/><a:buChar char="•"/>
</a:pPr>
<a:r>
<a:rPr lang="vi-VN" sz="2000" dirty="0">
<a:solidFill><a:srgbClr val="${hex(theme.text)}"/></a:solidFill>
<a:latin typeface="${esc(theme.fontBody)}"/>
</a:rPr>
<a:t>${esc(b)}</a:t>
</a:r>
</a:p>`).join("");

            shapes.push(`
<p:sp>
<p:nvSpPr><p:cNvPr id="${shapeId++}" name="Body"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
<p:spPr>
<a:xfrm><a:off x="838200" y="${isTitle ? 4267200 : 1752600}"/><a:ext cx="10515600" cy="${isTitle ? 1828800 : 4419600}"/></a:xfrm>
<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
</p:spPr>
<p:txBody>
<a:bodyPr wrap="square"><a:normAutofit/></a:bodyPr>
<a:lstStyle/>
${paragraphs}
</p:txBody>
</p:sp>`);

        }

        const bg = isTitle ? theme.titleBackground : theme.background;

        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="${XMLNS.a}" xmlns:p="${XMLNS.p}" xmlns:r="${XMLNS.r}">
<p:cSld>
<p:bg><p:bgPr><a:solidFill><a:srgbClr val="${hex(bg)}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
<p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
${shapes.join("")}
</p:spTree>
</p:cSld>
<p:clrMapOvr><a:overrideClrMapping bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/></p:clrMapOvr>
</p:sld>`;

    }

}
