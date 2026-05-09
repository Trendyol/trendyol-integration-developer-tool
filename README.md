# Trendyol Integration Developer Tool

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

A Claude Code plugin that provides expert guidance for implementing Trendyol Marketplace seller integrations. Uses the Trendyol Developer Tools MCP server as the authoritative source of truth for all API contracts, business rules, and validation logic.

---

## API Scope

This plugin covers the following Trendyol Marketplace API domains only:

- **Trendyol Marketplace — Product Integration API (TR)**
- **Trendyol Marketplace — Product Integration V2 API (TR)**
- **Trendyol International Marketplace — Product Integration API**

Reference: https://developers.trendyol.com/reference/getbrands

Other Trendyol API domains (Orders, Shipments, Finance, Claims, etc.) are out of scope.

---

## What This Plugin Does

This plugin transforms Claude Code into a specialist integration assistant that:

- **Plans integrations** before writing code — generates structured, module-by-module integration plans
- **Reads live API contracts** from the MCP server — never guesses endpoint details
- **Validates payloads** against canonical schemas before proposing them as ready
- **Generates curl commands, example requests, and test fixtures** from live endpoint definitions
- **Provides language-specific implementation guides** for TypeScript, Kotlin, Java, Python, Go, C#, PHP, Ruby
- **Adapts to your existing codebase** — repo-aware mode matches your architecture and conventions
- **Guards against accidental production calls** — PreToolUse hook blocks any tool call targeting the Trendyol production API without explicit confirmation

---

## Prerequisites

This plugin connects to the Trendyol Developer Tools MCP server hosted at:

```
https://apigw.trendyol.com/trendyol-developer-tools-mcp-server/sse
```

The `.mcp.json` in this plugin configures the connection automatically. No local setup is required — the MCP server is a managed, always-on endpoint.

> **Access:** The MCP server endpoint may require credentials or network access granted by Trendyol. Contact your Trendyol integration team if you receive connection errors.

---

## Installation

```bash
/plugin marketplace add trendyol/trendyol-integration-developer-tool
/plugin install trendyol-integration-developer-tool@trendyol
/reload-plugins
```

---

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

---

## Safety — PreToolUse Hook

The plugin includes a safety guard (`hooks/pretool-guard.mjs`) that intercepts any tool call targeting the Trendyol production API URL (`https://apigw.trendyol.com`).

**What it blocks:**

- Bash or shell commands containing `https://apigw.trendyol.com`
- Computer or browser tool calls navigating to `https://apigw.trendyol.com`
- `generateCurl` calls with `environment: "production"`
- Any tool input where the serialized payload contains the production URL

**To allow a confirmed production call**, the tool input must include all three fields:

```json
{
  "confirmExecution": "CONFIRM_PRODUCTION_EXECUTION",
  "acknowledgeRisks": true,
  "reason": "<why this production call is necessary>"
}
```

Stage calls (`https://stageapigw.trendyol.com`) are never blocked. All generated curl commands target stage by default. Production URL is shown as a comment only.

---

## Marketplace Support

Both TR and GLOBAL marketplace integrations are supported. The `marketplace` parameter on `validateRequest` and `validatePayload` controls marketplace-specific validation:
---

## Example Use Cases

**1. Plan a full product onboarding integration in Kotlin**
```
"Kotlin ile Trendyol ürün entegrasyonu planı hazırla."
```
Claude calls `getIntegrationPlan`, presents ordered modules with dependencies, confirms scope, then generates implementation guides one module at a time.

**2. Validate a createProducts payload before sending**
```
"Bu payload'ı createProducts için doğrula, TR marketplace."
```
Claude calls `validateRequest` (schema + business rules) and `validateProductAgainstCategoryAttributes` (semantic attribute check). Returns every error with path, code, and exact fix instructions.

**3. Understand which update endpoint to use**
```
"Onaylı bir ürünün başlık ve görsellerini güncellemem lazım. Hangi endpoint?"
```
Claude calls `searchEndpoints`, then `getEndpoint("updateApprovedProductContent")`, explains the content/variant/delivery split, and warns about the full-attribute-send requirement.

**4. Generate a stage curl for updatePriceAndInventory**
```
"updatePriceAndInventory için curl ver, seller 12345, TR marketplace."
```
Claude calls `generateCurl` with `environment=stage`. Returns a ready-to-run curl targeting `stageapigw.trendyol.com` with auth encoding instructions. Production URL shown as comment only.

**5. Implement async batch polling in Python**
```
"Python'da updatePriceAndInventory sonrası getBatchRequestResult nasıl poll ederim?"
```
Claude calls `getBatchPollingStrategy("updatePriceAndInventory")`, surfaces the 15-minute idempotency rule and 4-hour expiry window, then generates language-specific polling code with item-level failure inspection.

**6. Resolve category attributes before creating products**
```
"601 kategorisinde ürün oluşturuyorum. Hangi attribute'ları göndermem lazım?"
```
Claude calls `getEndpoint("getCategoryAttributes")`, explains required vs optional attributes, allowCustom semantics, varianter and slicer flags.

**7. Generate test fixtures for integration testing**
```
"createProducts için geçerli ve hatalı test payload'ları ver."
```
Claude calls `generateTestFixtures("createProducts")`, returns fixtures covering invalid price relation, missing required attributes, wrong attribute format, oversized batch, duplicate barcodes, and HTTP image URLs.

**8. Add Trendyol integration to an existing Spring Boot project**
```
"Mevcut Spring Boot servisime updatePriceAndInventory ekle."
```
Claude analyzes the project structure, identifies the HTTP client in use, calls `getEndpoint` + `generateImplementationGuide("inventory_price", "java")`, and generates code that matches existing conventions.

---

## Architecture

```
trendyol-integration-developer-tool/
├── .claude-plugin/
│   └── plugin.json          — plugin manifest
├── hooks/
│   ├── hooks.json           — PreToolUse hook registration
│   └── pretool-guard.mjs    — production API safety guard
├── skills/
│   └── trendyol-integration-developer-tool/
│       └── SKILL.md         — specialist behavior rules and workflow
├── .mcp.json                — MCP server connection (managed endpoint)
├── marketplace.json         — marketplace manifest
└── LEGAL.md                 — terms, data handling, liability
```

---

## Bug Reports & Feature Requests

Please open an issue on GitHub:
- [Bug report](https://github.com/trendyol/trendyol-integration-developer-tool/issues/new?template=bug_report.md)
- [Feature request](https://github.com/trendyol/trendyol-integration-developer-tool/issues/new?template=feature_request.md)

For issues with the Trendyol Marketplace APIs themselves, use [Trendyol Developer Support](https://developers.trendyol.com/docs/support-request).

---

## Legal

See [LEGAL.md](./LEGAL.md) for terms of use, data handling policy, and liability information.

This plugin is developed and maintained by **Trendyol Group**.
License: Apache-2.0 — Copyright © Trendyol Group
