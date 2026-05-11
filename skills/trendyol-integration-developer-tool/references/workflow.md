# Workflow

## Step 1: Classify and detect context

Use the routing table in SKILL.md to determine first action.

**Marketplace detection:**
- No marketplace specified → default `TR`, confirm with user
- User mentions GLOBAL, specific country (SA, RO, etc.) → `marketplace: "GLOBAL"`
- Always confirm before running validation or generating curl

**Repository detection signals:**
- Workspace files visible with existing source code
- User mentions file names, class names, existing service
- User says "add to my existing project/service/app"
- User pastes existing code

---

## Step 2: For broad requests — plan first

Call `getIntegrationPlan` for any of these:
- "Trendyol entegrasyonu yap" / "Build me a Trendyol integration"
- Any language + integration request
- "Ürün onboarding implementasyonu" / "Product onboarding implementation"
- "Stok sync sistemi" / "Stock sync system"
- "Tam entegrasyon" / "Full integration"
- "Hangi endpoint'leri kullanmalıyım" / "Which endpoints do I need"
- Any request involving multiple modules or unclear scope

```
getIntegrationPlan({
  language: "kotlin",            // if specified
  includeModules: [...],          // if user wants specific modules
  excludeModules: ["buybox"],     // if user excluded
  includeOptionalModules: false   // true only if user wants buybox
})
```

After receiving the plan:
1. Present each module step with its goal
2. Explain sequence and why (catalog_lookup before product_onboarding)
3. Confirm scope, marketplace, target language with user
4. Use `recommendedNextAction` to drive the next step
5. Implement one module at a time — never dump all modules at once

---

## Step 3: Read endpoint contract

For every endpoint you will use, call `getEndpoint(endpointKey)` first. Read:
- method, path
- pathParams, queryParams, headers
- requestBody.properties (all fields, required flags, types, constraints)
- businessRules
- responses
- enums
- deprecated flag
- observedInconsistencies

**Never generate implementation for an endpoint you have not read from MCP.**

---

## Step 4: Generate examples

```
generateExampleRequest(endpointKey, includeOptionalFields=false)
generateCurl(endpointKey, marketplace, pathParams, queryParams, body)
generateTestFixtures(endpointKey)  // no scenarios = all available
```

- Always pass correct `marketplace` to generateCurl
- curl always targets stage — point this out explicitly
- Present valid, invalid, and warning fixtures separately

---

## Step 5: Validate before finalizing

**For createProducts or updateUnapprovedProducts:**

If user doesn't have getCategoryAttributes response yet:
> "To run attribute validation, I need the getCategoryAttributes response for your category. Please call getCategoryAttributes({categoryId: YOUR_CATEGORY_ID}) first."

Then:
```
1. validateRequest(endpointKey, marketplace, pathParams, queryParams, headers, body)
2. validateProductAgainstCategoryAttributes(categoryAttributesResponse, productItems)
```

**For other mutation endpoints:**
```
validateRequest(endpointKey, marketplace, pathParams, queryParams, headers, body)
```

**Presenting results:**
- Explain each error: what is wrong, what was received, exactly how to fix
- Explain each warning: whether to address before sending
- Never say "ready" when errors exist
- If no errors: "Schema validation passed."

---

## Step 6: Generate implementation code

Only proceed after:
- Endpoint contract read via getEndpoint ✓
- Scope confirmed with user ✓
- Marketplace confirmed ✓
- Repo-aware mode analysis done (if applicable) ✓

**Implementation sequence:**
1. `generateImplementationGuide(moduleKey, language)` → auth, HTTP, polling, error patterns
2. Generate typed models from getEndpoint schema
3. Generate HTTP client code
4. `getBatchPollingStrategy(endpointKey)` for async endpoints → polling + item inspection
5. Generate error handling from HTTP status table in guide
6. `generateTestFixtures(endpointKey)` for test data

**Code quality requirements:**
- Base URL configurable (not hardcoded)
- Credentials from configuration (never hardcoded)
- Auth: base64(apiKey:apiSecret) → `Authorization: Basic {encoded}`
- storefrontCode configurable per marketplace
- Batch results stored before 4-hour expiry
- Failed items collected separately for retry
- 15-minute idempotency handled for updatePriceAndInventory

---

## Step 7: Batch tracking for every async mutation

```
1. getBatchPollingStrategy(endpointKey)
2. Read specialRules — especially 15-minute rule for updatePriceAndInventory
3. Read idempotencyRules for deduplication guidance
4. Generate polling from polling object
5. Generate item-level inspection from itemLevelChecks
6. Store results per expiryRules
```

See [`code-patterns.md`](code-patterns.md) for the full async batch pattern.

---

## Repo-Aware Mode checklist

Before generating any code when a repository is present:

**Identify:**
- Language and version (Kotlin 1.9, Java 17, Python 3.11...)
- Framework and version (Spring Boot 3.x, FastAPI, Gin...)
- Project structure (monorepo, multi-module Maven/Gradle, single-package)
- Architecture style (layered, hexagonal, microservice)
- HTTP client (RestTemplate, WebClient, OkHttp, Ktor, axios, httpx, Retrofit)
- Configuration pattern (application.yml, .env, config classes)
- DTO conventions (data classes, POJOs, Pydantic models, interfaces)
- Error handling style (exceptions, Result types, Either, problem details)
- Naming conventions (camelCase, snake_case, PascalCase)
- Test framework (JUnit 5, pytest, Jest, testify, xUnit)

**In Repo-Aware Mode:**
- Match project structure and file placement
- Use existing HTTP client — do not introduce a new one
- Follow existing naming conventions
- Reuse existing abstractions for auth, HTTP, error handling
- Add tests using existing test framework in existing test structure

**Never in Repo-Aware Mode:**
- Introduce different architectural pattern without being asked
- Introduce different HTTP client or library
- Rename existing concepts or packages
- Generate greenfield code without adapting to repository

**The rule: MCP determines WHAT, the repository determines HOW.**

If critical context is missing, ask rather than assume.
