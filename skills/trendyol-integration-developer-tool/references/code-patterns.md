# Code Patterns

## Auth pattern

Authorization uses HTTP Basic Auth with base64 encoding of `apiKey:apiSecret`.

```
credentials = base64(apiKey + ":" + apiSecret)
Authorization: Basic {credentials}
X-Supplier-Id: {sellerId}           // numeric string
storefrontCode: {storefrontCode}    // "TR" for TR, country code for GLOBAL (e.g. "SA", "RO")
```

**Rules:**
- Credentials and storefrontCode must come from configuration — never hardcoded in source code
- storefrontCode is configurable per marketplace, not a constant

For language-specific auth code: call `generateImplementationGuide(moduleKey, language)`.

---

## Async batch pattern

Every mutation endpoint is asynchronous. Response is always `{ "batchRequestId": "..." }`.

```
Step 1: Send mutation
  response = POST mutationEndpoint(payload)
  batchRequestId = response.batchRequestId
  store(batchRequestId)  // persist for later retrieval

Step 2: Poll for completion
  maxAttempts = 10
  intervalSeconds = 3

  for attempt in 1..maxAttempts:
    result = GET getBatchRequestResult(sellerId, batchRequestId)

    if result.status == "COMPLETED":
      break
    if result.status == "IN_PROGRESS":
      wait(intervalSeconds)

  if attempt == maxAttempts:
    throw TimeoutException("Batch polling timed out")

Step 3: Inspect item-level results  ← COMPLETED ≠ all succeeded
  failedItems = []
  for item in result.items:
    if item.status == "FAILED":
      failedItems.append({
        requestItem: item.requestItem,
        reasons: item.failureReasons
      })

Step 4: Handle failures
  log(failedItems)
  if shouldRetry:
    retryPayload = buildRetryPayload(failedItems)  // only failed items, not full batch
    // Go to Step 1 with retryPayload

Step 5: Store result before expiry
  persistResult(result)  // must happen within 4 hours of batch creation
```

For the exact strategy per endpoint (especially updatePriceAndInventory 15-minute rule):
```
getBatchPollingStrategy(endpointKey)
```

For language-specific polling code:
```
generateImplementationGuide(moduleKey, language)
```

---

## updatePriceAndInventory deduplication pattern

The same request (same barcodes, same values) cannot be sent within 15 minutes. Implement:

```
// Before sending updatePriceAndInventory:
for each item in payload.items:
  lastSent = deduplicationStore.get(item.barcode)

  if lastSent is not null:
    minutesSince = now() - lastSent.timestamp
    if minutesSince < 15 AND lastSent.values == item.values:
      skip this item  // do not include in request

// After sending:
for each item in sentPayload.items:
  deduplicationStore.set(item.barcode, {
    timestamp: now(),
    values: { quantity: item.quantity, salePrice: item.salePrice, listPrice: item.listPrice }
  })
```

Changing any field value (even by 1) resets the 15-minute window — only identical requests are blocked.

---

## Code quality requirements

All generated implementation code must follow these:

| Requirement | Rule |
|---|---|
| Base URL | Configurable via environment variable or config file. Never hardcoded. |
| Credentials | From configuration. Never hardcoded in source code. |
| storefrontCode | Configurable per marketplace. Never hardcoded. |
| Batch result storage | Must be stored before 4-hour expiry. |
| Failed item handling | Collect failed items separately. Never retry entire batch. |
| 15-minute idempotency | Implement deduplication for updatePriceAndInventory. |
| Polling | Max 10 attempts, 3-5 second interval. Handle timeout. |
| Item-level inspection | Always check items[].status after COMPLETED. |

---

## Stage vs production

Stage base URL: `https://stageapigw.trendyol.com`
Production base URL: `https://apigw.trendyol.com`

- All curl commands target stage by default
- Production URL shown as comment only
- In code: base URL must be configurable; stage is the default
- Never hardcode production URL
- The PreToolUse hook blocks production API calls without explicit confirmation
