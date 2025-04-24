// client.js
import { SHOPIFY_API_VERSION } from './constants.js';
import { delay } from './utils.js'; // Added for retry logic

/**
 * Makes a GraphQL request to the Shopify Admin API.
 * @param {string} shop - The shop's myshopify domain (e.g., 'your-store.myshopify.com').
 * @param {string} accessToken - The Shopify Admin API access token.
 * @param {string} query - The GraphQL query or mutation string.
 * @param {object} [variables] - Optional variables for the GraphQL query.
 * @param {number} [maxRetries=3] - Maximum number of retries for transient errors.
 * @param {number} [initialDelayMs=500] - Initial delay for retries (ms).
 * @returns {Promise<object>} The JSON response data from Shopify.
 * @throws {Error} If the request fails or Shopify returns GraphQL errors.
 */
export const makeShopifyRequest = async (
    shop,
    accessToken,
    query,
    variables,
    maxRetries = 3,
    initialDelayMs = 500
) => {
    const apiUrl = `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
    const headers = {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken
    };

    let attempt = 0;
    let currentDelay = initialDelayMs;

    while (attempt <= maxRetries) {
        attempt++;
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ query, variables })
            });

            // Success case (2xx status code)
            if (response.ok) {
                const jsonResponse = await response.json();

                if (jsonResponse.errors) {
                    console.error(
                        `Shopify GraphQL Errors (Shop: ${shop}, Attempt: ${attempt}):`,
                        JSON.stringify(jsonResponse.errors, null, 2)
                    );
                    // Do not retry on GraphQL schema/logic errors
                    throw new Error(
                        `Shopify GraphQL Error: ${jsonResponse.errors.map((e) => e.message).join(', ')}`
                    );
                }

                if (!jsonResponse.data) {
                    // Should not happen with ok response, but check defensively
                    throw new Error('Shopify API response missing data field despite OK status.');
                }

                return jsonResponse.data;
            }

            // Retryable error status codes (429 Too Many Requests, 5xx Server Errors)
            if ((response.status === 429 || response.status >= 500) && attempt <= maxRetries) {
                let errorBody = 'Could not read error body.';
                try {
                    errorBody = await response.text();
                } catch (_) {
                    /* ignore */
                }
                console.warn(
                    `Shopify API request to ${shop} failed with status ${response.status} (Attempt ${attempt}/${maxRetries}). Retrying in ${currentDelay}ms... Body: ${errorBody}`
                );
                await delay(currentDelay);
                currentDelay *= 2; // Exponential backoff
                continue; // Go to next attempt
            }

            // Attempt to get more specific error info if available
            let errorBody = 'Could not read error body.';
            try {
                errorBody = await response.text();
            } catch (_) {
                /* ignore */
            }
            // Throw non-retryable client errors (4xx other than 429) or if retries exhausted
            throw new Error(
                `Shopify API request failed for ${shop}: ${response.status} ${response.statusText} (Attempt ${attempt}). Body: ${errorBody}`
            );
        } catch (error) {
            // Handle fetch/network errors
            if (attempt <= maxRetries) {
                console.warn(
                    `Network error during Shopify API request to ${shop} (Attempt ${attempt}/${maxRetries}): ${error.message}. Retrying in ${currentDelay}ms...`
                );
                await delay(currentDelay);
                currentDelay *= 2; // Exponential backoff
                continue; // Go to next attempt
            } else {
                console.error(
                    `Error during Shopify API request to ${shop} after ${maxRetries} retries:`,
                    error
                );
                // Re-throw the final error if all retries fail or it's a non-retryable error
                throw error;
            }
        }
    }
    // Should not be reachable if maxRetries >= 0, but satisfies compiler/type checker
    throw new Error(`Shopify API request to ${shop} failed definitively after ${maxRetries} retries.`);
};
