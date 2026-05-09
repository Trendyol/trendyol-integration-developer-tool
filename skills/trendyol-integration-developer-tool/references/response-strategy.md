# Response Strategy

How to handle each user request type. Read the matching section and follow it — do not summarize.

---

## When the user starts broad

Trigger: "Trendyol entegrasyonu yap", "Build full seller integration", any multi-module request.

1. Call `getIntegrationPlan` immediately
2. Present each module with its goal and position in the sequence
3. Highlight key dependencies (catalog_lookup before product_onboarding)
4. Confirm scope, marketplace, target language
5. Use `recommendedNextAction` from plan result to drive next step
6. Proceed one module at a time — never dump all modules at once

---

## When the user targets a specific module

Trigger: "Stok sync implementasyonu", "Implement product onboarding", "catalog_lookup modülünü implement et".

1. Call `getIntegrationModules` to confirm the module key
2. Call `getIntegrationPlan` with `includeModules: [moduleKey]` for focused plan
3. Call `generateImplementationGuide(moduleKey, language)`
4. Generate code with full endpoint contract verification via `getEndpoint`

---

## When the user asks about a single endpoint

Trigger: "createProducts nasıl çalışır", "What does getCategoryAttributes return", "updatePriceAndInventory nedir".

1. Call `getEndpoint(endpointKey)` immediately
2. Present the contract details the user asked about
3. Generate examples or code as requested

---

## When the user asks for an example payload

Trigger: "createProducts örnek payload", "Show me a valid request body", "Bana örnek göster".

1. Call `getEndpoint(endpointKey)` first — read the contract
2. Call `generateExampleRequest(endpointKey, includeOptionalFields=false)`
3. Present with field explanations
4. Note which fields need real values ("replace brandId with value from getBrands")
5. Offer `includeOptionalFields=true` if user wants full contract

---

## When the user asks for a curl command

Trigger: "getBrands için curl ver", "Give me a curl for updatePriceAndInventory", "curl komutunu göster".

1. Confirm marketplace (TR or GLOBAL)
2. Call `generateCurl(endpointKey, marketplace, pathParams, queryParams, body)`
3. Point out that result targets stage — explicitly mention this
4. Show the Authorization encoding instruction from curl comments

---

## When the user provides a payload and asks "is this correct"

Trigger: "Bu payload doğru mu", "Validate this request", "Hata var mı".

1. Confirm marketplace (TR or GLOBAL) before validating
2. Call `validateRequest(endpointKey, marketplace, pathParams, queryParams, headers, body)`
3. If createProducts or updateUnapprovedProducts: also call `validateProductAgainstCategoryAttributes`
4. Present results:
    - Each error: what is wrong, what was received, exactly how to fix
    - Each warning: whether to address before sending
    - No errors: "Schema validation passed."
    - Errors present: "There are X errors that must be fixed before this request can succeed."
    - Never say "ready" when errors exist

---

## When the user asks about batch tracking or async behavior

Trigger: "Batch sonucu nasıl kontrol edilir", "How to poll for results", "getBatchRequestResult nasıl kullanılır".

1. Call `getBatchPollingStrategy(endpointKey)` for the specific endpoint
2. Present: polling strategy, idempotency rules, expiry rules, special rules
3. Generate polling code using `generateImplementationGuide(moduleKey, language)`
4. Emphasize: COMPLETED ≠ all items succeeded — always inspect item-level results

---

## When the user asks about test data

Trigger: "createProducts için test fixture'ları", "Edge case payloads for archiveProducts", "Hatalı payload örneği".

1. Call `generateTestFixtures(endpointKey)` without scenarios to get all available
2. Present valid, invalid, and warning fixtures in separate groups
3. Explain what each scenario demonstrates and what to look for

---

## When the user cannot name the endpoint

Trigger: "Stok güncelleme endpoint'i hangisi", "Ürün arşivleme", "Hangi endpoint'i kullanmalıyım".

1. Call `searchEndpoints(query)` with their description
2. Present matching endpoints with method, path, purpose
3. Ask which one they mean before proceeding

---

## When the user asks for implementation guides

Trigger: "Kotlin'de catalog lookup nasıl yazılır", "Python implementation", "Implement this for me in Go".

1. Confirm target language
2. Call `generateImplementationGuide(moduleKey, language)`
3. Generate typed models from `getEndpoint` schema
4. Generate HTTP client code
5. Include batch polling from `getBatchPollingStrategy` for async endpoints
6. Generate test data from `generateTestFixtures`

---

## When repository context exists

Trigger: User mentions existing files/classes, workspace has source code visible, "add to my existing service".

1. **Analyze the repository before anything else**
2. Identify: language, framework, HTTP client, project structure, conventions
3. Note where Trendyol integration code should be placed
4. Use MCP for contracts — use the repository for style
5. Generate only repository-compatible code
6. Match naming conventions, error handling patterns, test framework

See [`workflow.md`](workflow.md) for the full repo analysis checklist.

---

## Output quality criteria

For any response to be complete:
- Every endpoint used was first read via `getEndpoint`
- Marketplace was confirmed before validation or curl generation
- No payload was marked "ready" while validation errors exist
- All async mutations have polling and item-level failure handling
- Production URL is never hardcoded in generated code
- In repo-aware mode: generated code matches project structure and conventions
