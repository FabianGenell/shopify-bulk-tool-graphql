# Shopify Bulk Tool GraphQL

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

A Node.js module to simplify running Shopify GraphQL bulk operations (queries and mutations). It handles the asynchronous polling, result downloading, and parsing, allowing you to focus on your GraphQL operations.

## Features

*   Execute bulk GraphQL queries against the Shopify Admin API.
*   Execute bulk GraphQL mutations against the Shopify Admin API.
*   Automatically polls for bulk operation completion status.
*   Downloads and parses the resulting JSONL data from Shopify.
*   Optionally saves results directly to a specified file path.
*   Configurable polling interval and timeout.
*   Uses modern JavaScript (ES Modules, async/await).
*   Minimal dependencies.

## Installation

```bash
npm install shopify-bulk-tool-graphql
# or
yarn add shopify-bulk-tool-graphql
```

Alternatively, if installing directly from GitHub:

```bash
npm install github:FabianGenell/shopify-bulk-tool-graphql
```

## Usage

Ensure you have your Shopify store domain and a valid Admin API access token with the necessary permissions (`read_products`, `write_products`, etc., depending on your operation).

### Running a Bulk Query

```javascript
import { runShopifyBulkQuery } from 'shopify-bulk-tool-graphql';

const shop = 'your-store.myshopify.com';
const accessToken = 'your-admin-api-access-token';

const productQuery = `
  query {
    products {
      edges {
        node {
          id
          title
          status
        }
      }
    }
  }
`;

async function fetchProducts() {
  try {
    const results = await runShopifyBulkQuery({
      shop,
      accessToken,
      query: productQuery,
      // filePath: './product-results.json', // Optional: Uncomment to save to file instead
      // pollIntervalMs: 6000,           // Optional: Override default poll interval
      // timeoutMs: 600000              // Optional: Override default timeout
    });

    if (results) {
      console.log(`Fetched ${results.length} product results:`);
      // Process the results array
      console.log(JSON.stringify(results.slice(0, 2), null, 2)); // Log first 2 results
    } else {
      console.log('Product results saved to file.');
    }
  } catch (error) {
    console.error('Bulk query failed:', error);
  }
}

fetchProducts();
```

### Running a Bulk Mutation

**Important:** Bulk mutations often require preparing data via Shopify's `stagedUploadsCreate` mutation first. The `mutation` string you pass to `runShopifyBulkMutation` should typically be the one provided by Shopify to execute the bulk operation using the staged upload ID(s). Refer to the [Shopify Bulk Mutation documentation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/bulkOperationRunMutation) for details on structuring these operations.

The example below shows a *conceptual* mutation structure. Adapt it based on Shopify's requirements for your specific task.

```javascript
import { runShopifyBulkMutation } from 'shopify-bulk-tool-graphql';

const shop = 'your-store.myshopify.com';
const accessToken = 'your-admin-api-access-token';

// NOTE: This mutation string is illustrative.
// Real bulk mutations usually involve staged upload IDs.
// See Shopify documentation.
const productTagMutation = `
  mutation AddTagsToProduct($productId: ID!, $tags: [String!]!) {
    productUpdate(input: {id: $productId, tags: $tags}) {
      product {
        id
        tags
      }
      userErrors {
        field
        message
      }
    }
  }
  # This mutation structure might need to be adapted based on how
  # you structure the input data for bulkOperationRunMutation,
  # potentially using staged uploads.
`;

// Assume 'productTagMutation' is the correct string after potentially
// handling staged uploads as required by Shopify for your specific mutation.
async function tagProducts() {
  try {
    const results = await runShopifyBulkMutation({
      shop,
      accessToken,
      mutation: productTagMutation, // This string needs to be correctly formatted for bulk ops
      // filePath: './mutation-results.json', // Optional: Save results
    });

    if (results) {
      console.log('Bulk mutation completed. Results:', results);
      // Process results (often confirmation/errors rather than full data)
    } else {
      console.log('Mutation results saved to file.');
    }
  } catch (error) {
    console.error('Bulk mutation failed:', error);
  }
}

tagProducts();

```

## API

### `runShopifyBulkQuery(options)`

Executes a bulk query.

*   `options` (Object): Configuration object.
    *   `shop` (String, **required**): The shop's `*.myshopify.com` domain.
    *   `accessToken` (String, **required**): Shopify Admin API access token.
    *   `query` (String, **required**): The GraphQL query string.
    *   `filePath` (String, optional): Path to save results as JSON. If omitted, results are returned as an array.
    *   `pollIntervalMs` (Number, optional): Interval in milliseconds to poll for completion. Defaults to `5000`.
    *   `timeoutMs` (Number, optional): Maximum time in milliseconds to wait for completion. Defaults to `300000`.
*   Returns: `Promise<Array<Object> | null>` - Resolves with an array of result objects, or `null` if `filePath` was provided.
*   Throws: `Error` if the operation fails, times out, or encounters API errors.

### `runShopifyBulkMutation(options)`

Executes a bulk mutation.

*   `options` (Object): Configuration object.
    *   `shop` (String, **required**): The shop's `*.myshopify.com` domain.
    *   `accessToken` (String, **required**): Shopify Admin API access token.
    *   `mutation` (String, **required**): The GraphQL mutation string, often obtained after using `stagedUploadsCreate`. **See important note in Usage section.**
    *   `filePath` (String, optional): Path to save results as JSON. If omitted, results are returned as an array.
    *   `pollIntervalMs` (Number, optional): Interval in milliseconds to poll for completion. Defaults to `5000`.
    *   `timeoutMs` (Number, optional): Maximum time in milliseconds to wait for completion. Defaults to `300000`.
*   Returns: `Promise<Array<Object> | null>` - Resolves with an array of result objects (structure depends on the mutation), or `null` if `filePath` was provided.
*   Throws: `Error` if the operation fails, times out, or encounters API errors.

### Constants

The following constants are exported and can be imported if needed, though the defaults are used by the main functions:

*   `SHOPIFY_API_VERSION`: The Shopify API version used (e.g., `'2025-04'`).
*   `DEFAULT_POLL_INTERVAL_MS`: Default polling interval (5 seconds).
*   `DEFAULT_TIMEOUT_MS`: Default operation timeout (5 minutes).

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.
