# MCP Tool Reference

Server name: `TrendyolDeveloperToolsMcpServer`

---

## Discovery and Planning

### `getIntegrationModules`
Returns all integration modules grouped by capability. Each module contains its endpoint keys. Call when the user asks what modules exist or before `getIntegrationPlan`.

### `searchEndpoints`
Searches endpoints by keyword or semantic intent. Supports Turkish and English.

Turkish examples:
- "stok güncelle" → updatePriceAndInventory
- "ürün arşivle" → archiveProducts
- "toplu işlem kontrolü" → getBatchRequestResult
- "kategori özellikleri" → getCategoryAttributes
- "onaysız ürün güncelle" → updateUnapprovedProducts
- "buybox sorgula" → getBuyboxInformation
- "marka ara" → getBrandsByName
- "kilit kaldır" → unlockProducts
- "ürün sil" → deleteProducts
- "onaylı ürün listele" → filterApprovedProducts
- "batch sonucu" → getBatchRequestResult
- "teslimat güncelle" → updateApprovedProductDelivery
- "varyant güncelle" → updateApprovedProductVariant
- "içerik güncelle" → updateApprovedProductContent
- "kategori ağacı" → getCategoryTree
- "özellik değerleri" → getCategoryAttributeValues

### `getEndpoint`
Returns the full canonical endpoint definition: method, path, path params, query params, headers, request body schema, response schema, business rules, error examples, observed inconsistencies, enum definitions.

**Call before generating any code, example, or curl. Never implement without reading the contract first.**

What to read:
- `method` and `path` — exact HTTP method and URL
- `pathParams` — required params and types
- `queryParams` — types, enums, maximums
- `headers` — required headers and expected values
- `requestBody.properties` — all fields, required flags, constraints
- `businessRules` — business-level rules not captured in schema
- `responses` — success and error response structures
- `enums` — enum value definitions
- `deprecated` — if true, do not use this endpoint
- `observedInconsistencies` — known discrepancies between docs and actual behavior

### `getIntegrationPlan`
Generates a structured, ordered integration plan. Returns each module as a step with goal, endpoints, notes, and `suggestedNextAction`. Also returns `recommendedNextAction` and `recommendedStartingPoint`.

Parameters:
- `language` — target language (e.g., "kotlin", "typescript", "python")
- `includeModules` — optional module allow-list
- `excludeModules` — optional module deny-list
- `includeOptionalModules` — true to include buybox (excluded by default)

---

## Code and Request Generation

### `generateExampleRequest`
Generates a minimal valid example from the canonical schema. Required fields only by default.

Parameters:
- `endpointKey`
- `includeOptionalFields` — true for full contract including optional fields

### `generateCurl`
Generates a stage-first curl command. Production URL shown as comment. Includes Authorization placeholder with base64 encoding instructions.

Parameters:
- `endpointKey`
- `marketplace` — "TR" or "GLOBAL". Sets storefrontCode automatically (TR="1", GLOBAL=country code)
- `storefrontCode` — explicit for GLOBAL (e.g. "SA", "RO"). Auto-set for TR.
- `pathParams` — e.g. `{ sellerId: 12345 }`
- `queryParams` — e.g. `{ page: 0, size: 50 }`
- `body` — request body for POST/PUT/DELETE
- `acceptLanguage` — Accept-Language header value. Optional, default "en"
- `environment` — "stage" (default) or "production"

### `generateImplementationGuide`
Generates a language-specific implementation guide for a module. Includes: overview, ordered checklist with code patterns, HTTP error handling, retry strategy, auth setup, batch polling pattern, warnings, related modules.

Supported languages: typescript, javascript, kotlin, java, python, go, csharp, php, ruby.

Parameters:
- `moduleKey`
- `language`

### `generateTestFixtures`
Generates valid and intentionally broken test payloads. Each fixture has: `scenario`, `label`, `description`, `expectedOutcome` (valid/invalid/warning), `hint`, `payload` or `pathParams`/`queryParams`.

Mutation scenarios: minimal_valid, full_valid, invalid_price_relation, missing_required_field, oversized_batch, blank_barcode, duplicate_barcodes, invalid_enum, image_not_https, and more.

GET scenarios: valid_pagination, oversized_page, valid_search, missing_required_param, status_filter, date_filter, page_size_exceeds_limit.

Parameters:
- `endpointKey`
- `scenarios` — optional list; omit to get all available scenarios

### `getBatchPollingStrategy`
Returns the complete polling and retry strategy for an async endpoint.

Returns:
- `isAsynchronous` — whether polling is required
- `batchRequestType` — expected value in getBatchRequestResult
- `polling` — interval, maxAttempts, timeout, stopCondition
- `itemLevelChecks` — statusField, successValue, failureValue, failureReasonsField
- `specialRules` — endpoint-specific idempotency and timing rules
- `idempotencyRules` — deduplication guidance
- `expiryRules` — result availability window
- `pseudoCode` — language-agnostic polling walkthrough

Parameters:
- `endpointKey`

---

## Validation

### `validatePayload`
Validates a request body against the canonical endpoint schema.

Checks: required fields, types, enum constraints, maxLength, maximum, unknown fields (warning), semantic rules (price relations, delivery duration, duplicate barcodes, attribute format).

Parameters:
- `endpointKey`
- `payload`
- `marketplace` — "TR" enforces vatRate [0,1,10,20]. "GLOBAL" skips vatRate enum. Default: "TR"

Returns: `valid`, `errorCount`, `warningCount`, `errors[]`, `warnings[]`

### `validateRequest`
Validates a full request: path params, query params, headers, and body together. **Preferred over validatePayload when all components are available.**

Parameters:
- `endpointKey`
- `marketplace` — same as validatePayload
- `pathParams` — e.g. `{ sellerId: 12345 }`
- `queryParams` — e.g. `{ page: 0, size: 50, status: "onSale" }`
- `headers` — e.g. `{ Authorization: "Basic ...", "X-Supplier-Id": "12345" }`
- `body`

Validates:
- pathParams: required, type, sellerId > 0
- queryParams: required, type, enum, maximum, page×size product
- headers: Authorization format ("Basic " prefix), X-Supplier-Id numeric, fixed values, credential presence (warning)
- body: same as validatePayload + cross-section semantic rules

Returns: `marketplace`, per-section errors/warnings, flat `errors[]` and `warnings[]`

### `validateProductAgainstCategoryAttributes`
The most important pre-creation validation. Validates product attributes against the actual category definition from getCategoryAttributes. Pure static analysis — no API calls.

Checks:
- Required attributes present
- allowCustom=false → predefined IDs required, not free-text
- allowCustom=true → free-text preferred over predefined IDs
- allowMultipleAttributeValues=false → only one ID allowed
- Varianter attributes present
- Slicer attributes present
- Unknown attributeIds not in category

Accepts both formats:
- createProducts: `{ attributeId, attributeValueId: integer|null, customAttributeValue: string|null }`
- Update endpoints: `{ attributeId, attributeValueIds: integer[], attributeValue: string }`

Parameters:
- `categoryAttributesResponse` — full getCategoryAttributes response (pass directly)
- `productItems` — product items array with attributes
