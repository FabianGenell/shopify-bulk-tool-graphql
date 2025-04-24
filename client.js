// client.js
import { SHOPIFY_API_VERSION } from './constants.js';

/**
 * Makes a GraphQL request to the Shopify Admin API.
 * @param {string} shop - The shop's myshopify domain (e.g., 'your-store.myshopify.com').
 * @param {string} accessToken - The Shopify Admin API access token.
 * @param {string} query - The GraphQL query or mutation string.
 * @param {object} [variables] - Optional variables for the GraphQL query.
 * @returns {Promise<object>} The JSON response data from Shopify.
 * @throws {Error} If the request fails or Shopify returns GraphQL errors.
 */
export const makeShopifyRequest = async (shop, accessToken, query, variables) => {
    const apiUrl = `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
    const headers = {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ query, variables })
        });

        if (!response.ok) {
            // Attempt to get more specific error info if available
            let errorBody = 'Could not read error body.';
            try {
                errorBody = await response.text();
            } catch (_) {
                /* ignore */
            }
            throw new Error(
                `Shopify API request failed: ${response.status} ${response.statusText}. Body: ${errorBody}`
            );
        }

        const jsonResponse = await response.json();

        if (jsonResponse.errors) {
            console.error('Shopify GraphQL Errors:', JSON.stringify(jsonResponse.errors, null, 2));
            throw new Error(
                `Shopify GraphQL Error: ${jsonResponse.errors.map((e) => e.message).join(', ')}`
            );
        }

        if (!jsonResponse.data) {
            throw new Error('Shopify API response missing data field.');
        }

        return jsonResponse.data;
    } catch (error) {
        console.error(`Error during Shopify API request to ${shop}:`, error);
        // Re-throw the error to be handled by the caller
        throw error;
    }
};
