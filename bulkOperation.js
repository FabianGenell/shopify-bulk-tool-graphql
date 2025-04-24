// bulkOperation.js
import fs from 'fs/promises';
import { makeShopifyRequest } from './client.js';
import { delay, parseJsonl } from './utils.js';
import { DEFAULT_POLL_INTERVAL_MS, DEFAULT_TIMEOUT_MS } from './constants.js';

/**
 * Starts a Shopify bulk operation (query or mutation).
 * @param {string} shop
 * @param {string} accessToken
 * @param {string} operationBody - The actual GraphQL query or mutation for the bulk job.
 * @param {boolean} isMutation - True if it's a mutation, false if it's a query.
 * @returns {Promise<object>} The initial bulkOperation object from Shopify.
 */
const startBulkOperation = async (shop, accessToken, operationBody, isMutation) => {
    const mutationName = isMutation ? 'bulkOperationRunMutation' : 'bulkOperationRunQuery';
    const inputName = isMutation ? 'mutation' : 'query';

    const startMutation = `
        mutation ${mutationName}($operation: String!) {
            ${mutationName}(${inputName}: $operation) {
                bulkOperation {
                    id
                    status
                    url
                    errorCode
                }
                userErrors {
                    field
                    message
                }
            }
        }
    `;

    const variables = { operation: operationBody };
    const data = await makeShopifyRequest(shop, accessToken, startMutation, variables);

    if (data[mutationName]?.userErrors?.length > 0) {
        const errors = data[mutationName].userErrors.map((e) => `${e.field}: ${e.message}`).join(', ');
        throw new Error(`User errors starting bulk operation: ${errors}`);
    }

    if (!data[mutationName]?.bulkOperation) {
        throw new Error('Failed to start bulk operation. Response missing bulkOperation data.');
    }

    return data[mutationName].bulkOperation;
};

/**
 * Polls the status of an ongoing bulk operation.
 * Retries briefly if the operation is not found initially.
 * @param {string} shop
 * @param {string} accessToken
 * @param {string} operationId - The ID of the bulk operation (e.g., 'gid://shopify/BulkOperation/12345').
 * @param {number} [maxPollNotFoundRetries=3] - Max retries if operation not found.
 * @param {number} [pollNotFoundDelayMs=1000] - Delay between retries if not found.
 * @returns {Promise<object>} The current bulkOperation status object.
 * @throws {Error} If the operation cannot be found after retries.
 */
const pollBulkOperationStatus = async (
    shop,
    accessToken,
    operationId,
    maxPollNotFoundRetries = 3,
    pollNotFoundDelayMs = 1000
) => {
    const query = `
        query CurrentBulkOperation($id: ID!) {
            currentBulkOperation(id: $id) {
                id
                status
                errorCode
                createdAt
                completedAt
                objectCount
                fileSize
                url
                partialDataUrl
            }
        }
    `;
    const variables = { id: operationId };

    for (let attempt = 1; attempt <= maxPollNotFoundRetries + 1; attempt++) {
        const data = await makeShopifyRequest(shop, accessToken, query, variables);

        if (data.currentBulkOperation) {
            return data.currentBulkOperation;
        }

        // Operation not found, log and potentially retry
        if (attempt <= maxPollNotFoundRetries) {
            console.warn(
                `Polling attempt ${attempt}/${
                    maxPollNotFoundRetries + 1
                } returned no data for operation ID: ${operationId}. Retrying in ${pollNotFoundDelayMs}ms...`
            );
            await delay(pollNotFoundDelayMs);
        } else {
            // All retries failed
            console.error(
                `Could not find currentBulkOperation for ID: ${operationId} after ${attempt} attempts.`
            );
            throw new Error(
                `Could not find currentBulkOperation for ID: ${operationId} after ${attempt} attempts.`
            );
        }
    }
    // Should be unreachable due to the loop logic and throw inside
    throw new Error(`Unexpected state in pollBulkOperationStatus for ID: ${operationId}`);
};

/**
 * Downloads the content stream from the results URL.
 * @param {string} url - The URL provided by Shopify for the results.
 * @returns {Promise<import('stream').Readable>} The readable stream of the response body.
 * @throws {Error} If the download fails.
 */
const downloadResults = async (url) => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to download results: ${response.status} ${response.statusText}`);
        }
        if (!response.body) {
            throw new Error('Response body is null, cannot download results.');
        }
        console.log(`Result Content-Type: ${response.headers.get('content-type')}`); // Keep for debugging
        return response.body;
    } catch (error) {
        console.error(`Error downloading results from ${url}:`, error);
        throw error;
    }
};

/**
 * Runs a bulk operation, waits for completion, and retrieves results.
 * @param {string} shop
 * @param {string} accessToken
 * @param {string} operationBody - The GraphQL query or mutation.
 * @param {boolean} isMutation - True for mutation, false for query.
 * @param {string} [filePath] - Optional path to save the results JSON.
 * @param {number} [pollIntervalMs=DEFAULT_POLL_INTERVAL_MS] - How often to check status (ms).
 * @param {number} [timeoutMs=DEFAULT_TIMEOUT_MS] - Maximum time to wait for completion (ms).
 * @returns {Promise<Array<object> | null>} Array of result objects, or null if saved to file.
 */
export const executeBulkOperation = async (
    shop,
    accessToken,
    operationBody,
    isMutation,
    filePath,
    pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
    timeoutMs = DEFAULT_TIMEOUT_MS
) => {
    console.log(`Starting bulk ${isMutation ? 'mutation' : 'query'}...`);
    const startTime = Date.now();
    let operation = await startBulkOperation(shop, accessToken, operationBody, isMutation);
    const operationId = operation.id;
    console.log(`Bulk operation created with ID: ${operationId}, Status: ${operation.status}`);

    while (Date.now() - startTime < timeoutMs) {
        if (operation.status === 'COMPLETED') {
            console.log(`Bulk operation ${operationId} completed.`);
            if (!operation.url) {
                console.warn(
                    `Operation ${operationId} completed but no result URL provided. Object count: ${operation.objectCount}.`
                );
                // If 0 objects, URL might be null. Return empty array or null based on filePath.
                if (filePath) {
                    await fs.writeFile(filePath, '', 'utf-8'); // Write empty file
                    console.log(`Empty result file saved to ${filePath}`);
                    return null;
                } else {
                    return [];
                }
            }

            console.log(`Downloading results from ${operation.url}...`);
            const resultStream = await downloadResults(operation.url);
            // Note: Cannot easily log stream size here without consuming it.

            console.log(`Parsing results stream...`);
            const results = await parseJsonl(resultStream);
            console.log(`Parsed ${results.length} objects.`);

            if (filePath) {
                await fs.writeFile(filePath, JSON.stringify(results, null, 2), 'utf-8');
                console.log(`Results saved to ${filePath}`);
                return null; // Indicate success by saving file
            } else {
                return results; // Return parsed data
            }
        }

        if (
            operation.status === 'FAILED' ||
            operation.status === 'CANCELLED' ||
            operation.status === 'EXPIRED'
        ) {
            throw new Error(
                `Bulk operation ${operationId} failed with status ${operation.status}. Error code: ${operation.errorCode}`
            );
        }

        // Wait before polling again
        await delay(pollIntervalMs);
        console.log(`Polling status for ${operationId}... Current status: ${operation.status}`);
        operation = await pollBulkOperationStatus(shop, accessToken, operationId);
    }

    // If loop finishes, it's a timeout
    throw new Error(
        `Bulk operation ${operationId} timed out after ${timeoutMs / 1000} seconds. Last status: ${
            operation.status
        }`
    );
};
