/**
 * DocumentAnalyzer
 * Offline heuristic analysis of a parsed document:
 * sections, keywords, statistics, summary.
 */

const STOPWORDS = new Set([
    // Vietnamese
    "và","của","là","có","các","được","cho","trong","với","một","những",
    "này","đó","khi","đã","để","không","người","cũng","như","từ","trên",
    "theo","về","ra","lại","thì","mà","nên","bị","vào","đến","hay","hoặc",
    "nếu","vì","do","tại","sau","trước","giữa","nhiều","rất","còn","phải",
    "sẽ","đang","làm","việc","bằng","cả","chỉ","tuy","nhưng","nó","họ",
    // English
    "the","a","an","and","or","of","to","in","on","for","with","is","are",
    "was","were","be","by","as","at","that","this","it","from","not","have",
    "has","had","but","they","their","we","you","he","she","his","her","its",
    "can","will","would","should","which","there","been","more","also","than"
]);

export class DocumentAnalyzer {

    /**
     * Analyze a parsed document (from ParserManager).
     */
    analyze(doc) {

        const text = this.extractText(doc);

        const lines = text.split(/\r?\n/);

        const sections = this.detectSections(lines, doc);

        const keywords = this.extractKeywords(text);

        const stats = this.computeStats(text, doc, sections);

        return {
            title: this.cleanTitle(doc.title || "Tài liệu"),
            sections,
            keywords,
            stats,
            analyzedAt: new Date().toISOString()
        };

    }

    extractText(doc) {

        return (doc.pages || [])
            .map(p => p.text ?? p.content ?? p.markdown ?? "")
            .join("\n\n");

    }

    cleanTitle(title) {

        return String(title).replace(/\.(pdf|txt|md|html?|markdown)$/i, "");

    }

    /**
     * Detect headings and split content into sections.
     */
    detectSections(lines, doc) {

        const sections = [];

        let current = null;

        const pushCurrent = () => {
            if (current && (current.content.trim() || current.title)) {
                current.sentences = this.splitSentences(current.content);
                sections.push(current);
            }
        };

        for (const raw of lines) {

            const line = raw.trim();

            if (!line) {
                if (current) current.content += "\n";
                continue;
            }

            if (this.isHeading(line)) {

                pushCurrent();

                current = {
                    title: line.replace(/^#{1,6}\s*/, "").trim(),
                    content: "",
                    sentences: []
                };

            } else {

                if (!current) {
                    current = { title: "", content: "", sentences: [] };
                }

                current.content += line + "\n";

            }

        }

        pushCurrent();

        /*
        Fallback: no headings found -> split by pages,
        then by sentence chunks.
        */
        if (sections.length <= 1 && (doc.pages || []).length > 1) {

            return doc.pages.map((p, i) => {

                const content = p.text ?? p.content ?? p.markdown ?? "";

                return {
                    title: `Trang ${p.pageNumber ?? i + 1}`,
                    content,
                    sentences: this.splitSentences(content)
                };

            }).filter(s => s.content.trim());

        }

        if (sections.length === 1 && sections[0].sentences.length > 12) {

            return this.chunkSection(sections[0]);

        }

        return sections;

    }

    isHeading(line) {

        if (line.length > 90) return false;

        if (/^#{1,6}\s+/.test(line)) return true;

        if (/[.!?;:,]$/.test(line)) return false;

        if (/^(chương|phần|mục|bài|chapter|section|part)\s+[\divxlc]+/i.test(line)) return true;

        if (/^([IVXLC]+|\d+(\.\d+)*)[.)]\s+\S/.test(line)) return true;

        const letters = line.replace(/[^A-Za-zÀ-ỹ]/g, "");

        if (letters.length >= 4) {

            const upper = letters.replace(/[^A-ZÀ-Ỹ]/g, "").length;

            if (upper / letters.length > 0.8 && line.length <= 70) return true;

        }

        return false;

    }

    chunkSection(section) {

        const chunks = [];
        const size = 6;

        for (let i = 0; i < section.sentences.length; i += size) {

            const sentences = section.sentences.slice(i, i + size);

            chunks.push({
                title: section.title || `Phần ${chunks.length + 1}`,
                content: sentences.join(" "),
                sentences
            });

        }

        return chunks;

    }

    splitSentences(text) {

        return text
            .replace(/\s+/g, " ")
            .split(/(?<=[.!?…])\s+(?=[A-ZÀ-Ỹ0-9"'“])|\n+/)
            .map(s => s.trim())
            .filter(s => s.length > 2);

    }

    extractKeywords(text, limit = 12) {

        const freq = new Map();

        const words = text
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, " ")
            .split(/\s+/)
            .filter(w => w.length >= 3 && !STOPWORDS.has(w) && !/^\d+$/.test(w));

        for (const w of words) {
            freq.set(w, (freq.get(w) || 0) + 1);
        }

        return [...freq.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([word, count]) => ({ word, count }));

    }

    computeStats(text, doc, sections) {

        const words = text.split(/\s+/).filter(Boolean);

        return {
            pages: (doc.pages || []).length,
            sections: sections.length,
            words: words.length,
            characters: text.length,
            readingMinutes: Math.max(1, Math.round(words.length / 200))
        };

    }

}
