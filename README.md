# Trendyol Integration Developer Tool

A Claude Code plugin that provides expert guidance for implementing Trendyol Marketplace seller integrations. Uses the Trendyol Developer Tools MCP server as the authoritative source of truth for all API contracts, business rules, and validation logic.

## What This Plugin Does

This plugin transforms Claude Code into a specialist integration assistant that:

- **Plans integrations** before writing code — generates structured, module-by-module integration plans
- **Reads live API contracts** from the MCP server — never guesses endpoint details
- **Validates payloads** against canonical schemas before proposing them as ready
- **Generates curl commands, example requests, and test fixtures** from live endpoint definitions
- **Provides language-specific implementation guides** for TypeScript, Kotlin, Java, Python, Go, C#, PHP, Ruby
- **Adapts to your existing codebase** — repo-aware mode matches your architecture and conventions
- **Guards against accidental mutations** — PreToolUse hook blocks unconfirmed production write operations

## Prerequisites

The Trendyol Developer Tools MCP server must be running locally:

```bash
# Start the MCP server
npm start  # runs on http://localhost:3000/sse
```

The `.mcp.json` file in this plugin connects Claude Code to the MCP server automatically.

## Installation

```bash
/plugin marketplace add trendyol/trendyol-integration-developer-tool
/plugin install trendyol-integration-developer-tool@trendyol
```

## Available Capabilities

### MCP Tools (via TrendyolDeveloperToolsMcpServer)

| Tool | Purpose |
|---|---|
| `getIntegrationPlan` | Generate a module-by-module integration plan |
| `getIntegrationModules` | List all available integration modules |
| `getEndpoint` | Read the full canonical endpoint contract |
| `searchEndpoints` | Find endpoints by keyword (Turkish and English) |
| `generateCurl` | Generate stage-first curl commands |
| `generateExampleRequest` | Generate minimal valid request payloads |
| `generateImplementationGuide` | Language-specific implementation guides |
| `generateTestFixtures` | Valid and invalid test payloads for edge case testing |
| `getBatchPollingStrategy` | Async result polling and retry strategies |
| `validatePayload` | Validate request body against endpoint schema |
| `validateRequest` | Validate full request including headers, path params, query params |
| `validateProductAgainstCategoryAttributes` | Semantic attribute validation against category definition |

### Integration Modules

| Module | Endpoints |
|---|---|
| `catalog_lookup` | getBrands, getBrandsByName, getCategoryTree, getCategoryAttributes, getCategoryAttributeValues |
| `product_onboarding` | createProducts |
| `product_update` | updateUnapprovedProducts, updateApprovedProductContent, updateApprovedProductVariant, updateApprovedProductDelivery |
| `inventory_price` | updatePriceAndInventory |
| `product_lifecycle` | archiveProducts, unlockProducts, deleteProducts |
| `batch_tracking` | getBatchRequestResult |
| `product_search` | getProductBase, filterApprovedProducts, filterUnapprovedProducts |
| `buybox` | getBuyboxInformation |

## Safety — PreToolUse Hook

The plugin includes a safety guard that intercepts any tool calls matching execution patterns for write operations:

- `executeCreateProducts`
- `executeUpdatePriceAndInventory`
- `executeUpdateProduct`
- `executeArchiveProducts`

**Stage execution** requires `confirmExecution: "CONFIRM_STAGE_EXECUTION"` and `dryRun: false`.

**Production execution** additionally requires `confirmExecution: "CONFIRM_PRODUCTION_EXECUTION"`, `acknowledgeRisks: true`, and a non-empty `reason`.

## Marketplace Support

Both TR and GLOBAL marketplace integrations are supported. The `marketplace` parameter on `validateRequest` and `validatePayload` controls vatRate validation:

- **TR**: vatRate enforced as one of `[0, 1, 10, 20]`
- **GLOBAL**: vatRate not enum-enforced (country-specific rates)

## Example Usage

```
# Start with a broad integration request
"Kotlin ile Trendyol seller entegrasyonu yap"

# Or target a specific module
"catalog_lookup modülünü implement et"

# Validate a payload
"Bu createProducts payloadı doğru mu?"

# Get a curl command
"createProducts için curl ver, sellerId=12345"
```

## Architecture

```
.claude-plugin/
  plugin.json          — plugin manifest
hooks/
  hooks.json           — PreToolUse hook registration
  pretool-guard.mjs    — execution safety guard
skills/
  trendyol-integration-developer-tool/
    SKILL.md           — specialist system prompt + workflow rules
.mcp.json              — MCP server connection (localhost:3000)
```
