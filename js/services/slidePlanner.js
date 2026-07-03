/**
 * SlidePlanner
 * Converts an analysis result into an editable slide plan.
 */

let counter = 0;

function uid() {
    counter++;
    return `slide-${Date.now().toString(36)}-${counter}`;
}

export class SlidePlanner {

    /**
     * Build slide plan from analysis.
     */
    plan(analysis, options = {}) {

        const maxBullets = options.maxBullets ?? 5;
        const maxBulletLength = options.maxBulletLength ?? 140;

        const slides = [];

        /*
        Title slide
        */
        slides.push({
            id: uid(),
            type: "title",
            title: analysis.title,
            subtitle:
                `${analysis.stats.sections} phần · ` +
                `${analysis.stats.words} từ · ` +
                `~${analysis.stats.readingMinutes} phút đọc`,
            bullets: [],
            notes: ""
        });

        /*
        Content slides
        */
        analysis.sections.forEach((section, index) => {

            const bullets = this.makeBullets(
                section,
                maxBullets,
                maxBulletLength
            );

            slides.push({
                id: uid(),
                type: "content",
                title: section.title || `Phần ${index + 1}`,
                subtitle: "",
                bullets,
                notes: section.content.slice(0, 500)
            });

        });

        /*
        Summary slide
        */
        if (analysis.keywords.length) {

            slides.push({
                id: uid(),
                type: "summary",
                title: "Tổng kết",
                subtitle: "Từ khóa chính",
                bullets: analysis.keywords
                    .slice(0, 8)
                    .map(k => `${k.word} (${k.count})`),
                notes: ""
            });

        }

        return slides;

    }

    makeBullets(section, maxBullets, maxLength) {

        const sentences = section.sentences.length
            ? section.sentences
            : [section.content];

        return sentences
            .slice(0, maxBullets)
            .map(s => this.truncate(s.trim(), maxLength))
            .filter(Boolean);

    }

    truncate(text, max) {

        if (text.length <= max) return text;

        const cut = text.slice(0, max);

        const lastSpace = cut.lastIndexOf(" ");

        return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut) + "…";

    }

    /**
     * Create one empty slide.
     */
    empty() {

        return {
            id: uid(),
            type: "content",
            title: "Slide mới",
            subtitle: "",
            bullets: ["Nội dung..."],
            notes: ""
        };

    }

}
