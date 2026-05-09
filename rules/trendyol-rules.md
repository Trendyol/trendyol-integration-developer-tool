# Trendyol Integration — Agent Rules

These rules apply to all Claude Code sessions in this project, regardless of which plugin or skill is active.

---

## API Knowledge

Never rely on training data for Trendyol Marketplace API details.

Endpoint paths, HTTP methods, field names, required/optional flags, enum values, business rules, batch size limits, rate limits, and idempotency windows all change over time. Your training data may be outdated.

When working on any Trendyol integration task:
- Use the `TrendyolDeveloperToolsMcpServer` MCP tools as the source of truth
- Call `getEndpoint(endpointKey)` before generating code or curl for any endpoint
- Call `searchEndpoints(query)` when the exact endpoint key is unknown
- Call `getIntegrationPlan` before writing implementation for a broad integration request

---

## Environment Safety

Default to stage. Never default to production.

- Stage: `https://stageapigw.trendyol.com`
- Production: `https://apigw.trendyol.com`

When generating curl commands, code, or test scripts:
- Target stage by default
- Show production URL as comment only
- Make base URL configurable in all generated code — never hardcode it

The PreToolUse hook will block unconfirmed production API calls. Do not attempt to bypass it.

---

## Validation Before Mutation

Never propose a mutation payload as ready without first validating it.

For any createProducts or update endpoint:
1. Call `validateRequest(endpointKey, marketplace, ...)` — schema + business rules
2. For attribute-heavy payloads: also call `validateProductAgainstCategoryAttributes`

Always pass the correct `marketplace` parameter — TR and GLOBAL have different validation rules (vatRate enum, storefrontCode).

---

## Async Awareness

Every Trendyol mutation endpoint is asynchronous.

HTTP 200 from a mutation means the request was accepted, not that it succeeded. Always:
1. Capture the `batchRequestId` from the response
2. Poll `getBatchRequestResult` until status is `COMPLETED`
3. Inspect item-level `status` — COMPLETED ≠ all items succeeded
4. Collect `failedItems` and log `failureReasons`
5. Store results before the 4-hour expiry window

---

## Scope

This plugin covers only:
- Trendyol Marketplace Product Integration API (TR)
- Trendyol Marketplace Product Integration V2 API (TR)
- Trendyol International Marketplace Product Integration API

Do not use this plugin's tools or skills for Trendyol Orders, Shipments, Finance, Claims, or other API domains.
