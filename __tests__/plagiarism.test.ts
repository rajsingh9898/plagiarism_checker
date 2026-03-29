import { describe, it, expect } from "vitest";
import { normalizeText, getShingles, calculateJaccardSimilarity, findMatchRanges } from "../src/lib/plagiarism";

describe("Plagiarism Engine", () => {
    it("normalizes text correctly", () => {
        expect(normalizeText("Hello World! It's  a   great day.")).toBe("hello world its a great day");
    });

    it("generates 5-word shingles", () => {
        const text = "this is a simple test sentence for shingles";
        const shingles = getShingles(text, 5);
        expect(shingles).toEqual([
            "this is a simple test",
            "is a simple test sentence",
            "a simple test sentence for",
            "simple test sentence for shingles"
        ]);
    });

    it("returns whole text if less than 5 words", () => {
        const text = "too short";
        expect(getShingles(text, 5)).toEqual(["too short"]);
    });

    it("calculates Jaccard similarity correctly", () => {
        // 50% overlap
        const shinglesA = ["apple banana", "banana orange", "orange pear"];
        const shinglesB = ["banana orange", "orange pear", "pear grape"];
        // Intersection: "banana orange", "orange pear" (2)
        // Union: "apple banana", "banana orange", "orange pear", "pear grape" (4)
        // 2 / 4 = 0.5
        expect(calculateJaccardSimilarity(shinglesA, shinglesB)).toBeCloseTo(0.5);
    });

    it("finds match ranges effectively", () => {
        const originalText = "This is a simple test sentence for shingles. Let's see if it works.";
        const matches = ["simple test sentence for shingles"];

        // Original contains: "simple test sentence for shingles" exactly.
        const ranges = findMatchRanges(originalText, matches);
        expect(ranges.length).toBe(1);

        // Slice test
        const extracted = originalText.slice(ranges[0].start, ranges[0].end);
        expect(extracted.toLowerCase()).toContain("simple test sentence for shingles");
    });
});
