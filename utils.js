// utils.js
import readline from 'readline';

/**
 * Creates a promise that resolves after a specified delay.
 * @param {number} ms - The delay in milliseconds.
 * @returns {Promise<void>}
 */
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Parses JSONL data (newline-delimited JSON) from a readable stream.
 * @param {import('stream').Readable} stream - The readable stream containing JSONL data.
 * @returns {Promise<Array<object>>} A promise resolving to an array of parsed JSON objects.
 * @throws {Error} If a line is not valid JSON or the stream emits an error.
 */
export const parseJsonl = async (stream) => {
    const results = [];
    const rl = readline.createInterface({
        input: stream,
        crlfDelay: Infinity // Recognize all instances of CR LF ('\r\n') as a single line break.
    });

    let lineNumber = 0;
    try {
        for await (const line of rl) {
            lineNumber++;
            if (line.trim() === '') continue; // Ignore empty lines
            try {
                results.push(JSON.parse(line));
            } catch (error) {
                console.error(`Error parsing JSON on line ${lineNumber}: ${line}`);
                // Close the readline interface to stop processing
                rl.close();
                // Ensure the underlying stream is destroyed to prevent leaks if it's large
                stream.destroy();
                throw new Error(`Failed to parse JSONL line ${lineNumber}: ${error.message}`);
            }
        }
        return results;
    } catch (error) {
        // Handle potential stream errors or re-throw parsing errors
        console.error(`Error processing JSONL stream: ${error.message}`);
        // Ensure stream is destroyed on error
        if (!stream.destroyed) {
            stream.destroy();
        }
        throw error;
    }
};
