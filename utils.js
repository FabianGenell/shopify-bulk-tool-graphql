// utils.js
/**
 * Creates a promise that resolves after a specified delay.
 * @param {number} ms - The delay in milliseconds.
 * @returns {Promise<void>}
 */
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Parses JSONL data (newline-delimited JSON).
 * @param {string} jsonlData - The raw JSONL string data.
 * @returns {Array<object>} An array of parsed JSON objects.
 * @throws {Error} If a line is not valid JSON.
 */
export const parseJsonl = (jsonlData) => {
    if (!jsonlData) return [];
    const lines = jsonlData.trim().split('\n');
    return lines.map((line, index) => {
        try {
            return JSON.parse(line);
        } catch (error) {
            console.error(`Error parsing JSON on line ${index + 1}: ${line}`);
            throw new Error(`Failed to parse JSONL line ${index + 1}: ${error.message}`);
        }
    });
};
