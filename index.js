// index.js
import { executeBulkOperation } from './bulkOperation.js';

/**
 * Executes a Shopify bulk query, waits for completion, and returns or saves the results.
 *
 * @param {object} options - Configuration options.
 * @param {string} options.shop - The shop's myshopify domain (e.g., 'your-store.myshopify.com').
 * @param {string} options.accessToken - The Shopify Admin API access token.
 * @param {string} options.query - The GraphQL query string to execute in bulk.
 * Example: `query { products { edges { node { id title } } } }`
 * @param {string} [options.filePath] - Optional. If provided, saves the JSON results to this file path instead of returning them.
 * @param {number} [options.pollIntervalMs] - Optional. Polling interval in milliseconds. Defaults to 5000.
 * @param {number} [options.timeoutMs] - Optional. Timeout in milliseconds. Defaults to 300000.
 * @returns {Promise<Array<object> | null>} A promise that resolves to an array of result objects,
 * or null if filePath was provided and the file was saved successfully.
 * @throws {Error} If the operation fails, times out, or encounters API errors.
 */
export const runShopifyBulkQuery = async ({
    shop,
    accessToken,
    query,
    filePath,
    pollIntervalMs,
    timeoutMs
}) => {
    if (!shop || !accessToken || !query) {
        throw new Error('Missing required options: shop, accessToken, and query.');
    }
    return executeBulkOperation(
        shop,
        accessToken,
        query,
        false, // isMutation = false
        filePath,
        pollIntervalMs,
        timeoutMs
    );
};

/**
 * Executes a Shopify bulk mutation, waits for completion, and returns or saves the results.
 * Note: Bulk mutation results often just confirm changes and might not return extensive data like queries.
 * The structure of the JSONL result file depends heavily on the mutation performed.
 *
 * @param {object} options - Configuration options.
 * @param {string} options.shop - The shop's myshopify domain (e.g., 'your-store.myshopify.com').
 * @param {string} options.accessToken - The Shopify Admin API access token.
 * @param {string} options.mutation - The GraphQL mutation string to execute in bulk.
 * Example: `mutation TagProducts($ids: [ID!]!, $tags: [String!]!) { productAddTags(ids: $ids, tags: $tags) { userErrors { field message } products { id } } }`
 * (Note: The actual mutation passed to bulkOperationRunMutation often involves staging uploads first for mutations affecting many resources).
 * Refer to Shopify docs for structuring bulk mutations correctly, often involving `stagedUploadsCreate`.
 * @param {string} [options.filePath] - Optional. If provided, saves the JSON results to this file path instead of returning them.
 * @param {number} [options.pollIntervalMs] - Optional. Polling interval in milliseconds. Defaults to 5000.
 * @param {number} [options.timeoutMs] - Optional. Timeout in milliseconds. Defaults to 300000.
 * @returns {Promise<Array<object> | null>} A promise that resolves to an array of result objects,
 * or null if filePath was provided and the file was saved successfully.
 * @throws {Error} If the operation fails, times out, or encounters API errors.
 */
export const runShopifyBulkMutation = async ({
    shop,
    accessToken,
    mutation,
    filePath,
    pollIntervalMs,
    timeoutMs
}) => {
    if (!shop || !accessToken || !mutation) {
        throw new Error('Missing required options: shop, accessToken, and mutation.');
    }
    // Important: Bulk mutations often require data to be uploaded first via stagedUploadsCreate
    // The 'mutation' string passed here should typically be the result of that process
    // or a simpler mutation if it doesn't require staged uploads.
    // This example assumes 'mutation' is the correct string for bulkOperationRunMutation.
    console.warn(
        'Ensure the provided mutation string is correctly formatted for bulkOperationRunMutation, potentially involving staged upload IDs.'
    );

    return executeBulkOperation(
        shop,
        accessToken,
        mutation,
        true, // isMutation = true
        filePath,
        pollIntervalMs,
        timeoutMs
    );
};

// Optional: Export constants or other utils if needed externally
export * from './constants.js';
