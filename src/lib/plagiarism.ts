/**
 * Normalizes text for comparison.
 * - Lowercases it
 * - Removes non-alphanumeric characters except spaces
 * - Trims consecutive spaces
 */
export function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Generates an array of n-grams (shingles) based on words.
 */
export function getShingles(text: string, n = 5): string[] {
    const words = text.split(" ");
    if (words.length < n) return [text];

    const shingles: string[] = [];
    for (let i = 0; i <= words.length - n; i++) {
        shingles.push(words.slice(i, i + n).join(" "));
    }
    return shingles;
}

/**
 * Computes Jaccard Similarity between two arrays of shingles.
 * Score is between 0 and 1.
 */
export function calculateJaccardSimilarity(shinglesA: string[], shinglesB: string[]): number {
    if (shinglesA.length === 0 || shinglesB.length === 0) return 0;

    const setA = new Set(shinglesA);
    const setB = new Set(shinglesB);

    let intersection = 0;
    for (const item of setA) {
        if (setB.has(item)) intersection++;
    }

    const union = setA.size + setB.size - intersection;
    return intersection / union;
}

/**
 * Finds character ranges of matched shingles in the original text.
 */
export function findMatchRanges(originalText: string, matchedShingles: string[]) {
    const ranges: { start: number; end: number }[] = [];
    const lowerOriginal = originalText.toLowerCase();

    for (const shingle of matchedShingles) {
        const regexSource = shingle.split(" ").map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join("\\s+[^\\w]*\\s*");
        try {
            const regex = new RegExp(regexSource, "g");
            let match;
            while ((match = regex.exec(lowerOriginal)) !== null) {
                ranges.push({
                    start: match.index,
                    end: match.index + match[0].length
                });
            }
        } catch (e) {
            // ignore regex failures
        }
    }

    // Merge overlapping ranges
    ranges.sort((a, b) => a.start - b.start);
    const merged: { start: number; end: number }[] = [];

    for (const range of ranges) {
        if (merged.length === 0) {
            merged.push(range);
        } else {
            const last = merged[merged.length - 1];
            if (range.start <= last.end) {
                last.end = Math.max(last.end, range.end);
            } else {
                merged.push(range);
            }
        }
    }

    return merged;
}
