/**
 * PresentationValidator
 * Rule-based quality checks for the slide plan.
 */

export class PresentationValidator {

    validate(slides) {

        const issues = [];

        const add = (level, slideIndex, message) => {
            issues.push({ level, slideIndex, message });
        };

        if (!slides || slides.length === 0) {

            add("error", null, "Chưa có slide nào. Hãy tạo kế hoạch slide trước.");

            return this.summarize(issues, 0);

        }

        if (slides[0].type !== "title") {

            add("warning", 0, "Slide đầu tiên nên là slide tiêu đề.");

        }

        if (slides.length < 3) {

            add("warning", null, `Bài trình bày chỉ có ${slides.length} slide — nên có ít nhất 3.`);

        }

        if (slides.length > 40) {

            add("warning", null, `Bài trình bày có ${slides.length} slide — có thể quá dài.`);

        }

        slides.forEach((slide, i) => {

            const n = i + 1;

            if (!slide.title || !slide.title.trim()) {

                add("error", i, `Slide ${n}: thiếu tiêu đề.`);

            } else if (slide.title.length > 90) {

                add("warning", i, `Slide ${n}: tiêu đề dài ${slide.title.length} ký tự (nên ≤ 90).`);

            }

            if (slide.type === "content") {

                if (!slide.bullets || slide.bullets.length === 0) {

                    add("warning", i, `Slide ${n}: không có nội dung.`);

                }

                if (slide.bullets && slide.bullets.length > 6) {

                    add("warning", i, `Slide ${n}: có ${slide.bullets.length} gạch đầu dòng (nên ≤ 6).`);

                }

            }

            (slide.bullets || []).forEach((b, j) => {

                if (b.length > 200) {

                    add("warning", i, `Slide ${n}, dòng ${j + 1}: quá dài (${b.length} ký tự, nên ≤ 200).`);

                }

            });

        });

        return this.summarize(issues, slides.length);

    }

    summarize(issues, slideCount) {

        const errors = issues.filter(i => i.level === "error").length;
        const warnings = issues.filter(i => i.level === "warning").length;

        return {
            issues,
            errors,
            warnings,
            slideCount,
            passed: errors === 0,
            score: Math.max(0, 100 - errors * 20 - warnings * 5)
        };

    }

}
