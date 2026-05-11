# Integration Modules

Think in modules, not raw endpoints. Every user request maps to one or more modules.

## Module map

| Module | Purpose | Key endpoints |
|---|---|---|
| `catalog_lookup` | Resolve reference IDs before product creation | getBrands, getBrandsByName, getCategoryTree, getCategoryAttributes, getCategoryAttributeValues |
| `product_onboarding` | Create new products via V2 API | createProducts |
| `product_update` | Update product metadata after onboarding | updateUnapprovedProducts, updateApprovedProductContent, updateApprovedProductVariant, updateApprovedProductDelivery |
| `inventory_price` | Update stock and pricing for approved products | updatePriceAndInventory |
| `product_lifecycle` | Archive, unlock, delete products | archiveProducts, unlockProducts, deleteProducts |
| `batch_tracking` | Track async mutation results | getBatchRequestResult |
| `product_search` | Query and filter seller products | getProductBase, filterApprovedProducts, filterUnapprovedProducts |
| `buybox` | Observe competitive market state (optional) | getBuyboxInformation |

**Sequencing rule:** catalog_lookup always before product_onboarding. batch_tracking after every write.

---

## catalog_lookup

**Purpose:** Resolve all upstream reference data before product creation. Always the prerequisite for product_onboarding. Without resolved IDs, createProducts will fail.

### Endpoints

**`getBrands`** — Paginated brand list. Min 1000 brands per page. Use for bulk discovery.

**`getBrandsByName`** — Search by exact brand name. CASE-SENSITIVE — "Nike" ≠ "nike".

**`getCategoryTree`** — Full category hierarchy. Each category: id, name, parentId, subCategories. Always use the lowest-level (leaf) category ID. Parent IDs are rejected. Updated periodically — weekly refresh recommended.

**`getCategoryAttributes`** — Attribute definitions for a categoryId. Each attribute: allowCustom, allowMultipleAttributeValues, required, varianter, slicer, id, name. In V2, attribute values NOT returned inline — use getCategoryAttributeValues separately.

**`getCategoryAttributeValues`** — Paginated attribute value IDs for a specific attribute. Use when allowCustom=false and you need valid attributeValueIds. Max page=1000, max size=1000. Response field: `attributeValueName` (note: some responses use `attributeValue` — observed inconsistency).

### Critical rules
- Never hardcode brandId, categoryId, attributeId, attributeValueId. Always resolve from API.
- Category tree changes — weekly refresh or 7-day TTL.
- Brand search is case-sensitive.
- Always use the leaf (lowest-level) category. Traverse to deepest subCategories.
- getCategoryAttributeValues required when allowCustom=false and you need to present value options.
- Recommended cache TTLs: brands=1 day, categories=7 days, attributes=7 days.

---

## product_onboarding

**Purpose:** Create new products via the V2 API. First write operation in any integration.

### Endpoints

**`createProducts`** — POST `/integration/product/sellers/{sellerId}/v2/products`
- Asynchronous. Returns batchRequestId. Max 1000 items per request.

### Attribute format (createProducts only)
- `attributeValueId` (singular integer, nullable) — when allowCustom=false
- `customAttributeValue` (string, nullable) — when allowCustom=true
- Exactly one non-null per attribute; the other must be null
- **This format is DIFFERENT from update endpoints — never mix**

### Required fields per item
barcode, title, productMainId, brandId, categoryId, quantity, stockCode, dimensionalWeight, description, listPrice, salePrice, vatRate, images, attributes

### Business rules
- listPrice >= salePrice (enforced at API level)
- barcode: max 40 chars, allowed special: `.` `-` `_`
- title: max 100 chars
- productMainId: max 40 chars (used for variant grouping)
- stockCode: max 100 chars
- description: max 30000 chars, HTML supported
- images: max 8 items, HTTPS URLs, recommended 1200×1800px at 96dpi
- lotNumber: max 100 chars, allowed: A-Z a-z 0-9 , - . : /
- Duplicate barcodes within a batch → item-level failures, not HTTP errors
- Max 1000 items per request — split larger sets into batches

### Pre-send checklist
1. brandId resolved from getBrands/getBrandsByName?
2. categoryId resolved from getCategoryTree leaf node?
3. getCategoryAttributes called for this categoryId?
4. Required attributes identified?
5. attributeValueIds resolved from getCategoryAttributeValues for allowCustom=false attributes?
6. validateProductAgainstCategoryAttributes passed?
7. validateRequest passed with correct marketplace, no errors?

---

## product_update

**Purpose:** Update product metadata after onboarding. Four separate endpoints — choose based on approval state and what changes.

### Choosing the right endpoint

```
Is the product approved?
├─ No → updateUnapprovedProducts
└─ Yes → What are you changing?
         ├─ title / description / images / attributes → updateApprovedProductContent
         ├─ stockCode / vatRate / dimensionalWeight / addresses / lotNumber / locationBasedDelivery → updateApprovedProductVariant
         └─ deliveryDuration / fastDeliveryType → updateApprovedProductDelivery
```

### Update endpoint attribute format (different from createProducts)
- `attributeValueIds` (array of integers) — when allowCustom=false
- `attributeValue` (string) — when allowCustom=true
- Do NOT use `attributeValueId` (singular) or `customAttributeValue` — those are createProducts format

### Endpoints

**`updateUnapprovedProducts`** — POST `/integration/product/sellers/{sellerId}/products/unapproved-bulk-update`
- barcode is the identifier. Required, must not be blank.
- Most fields optional — send only what changes.
- Update endpoint attribute format (attributeValueIds / attributeValue).
- Max 1000 items. Asynchronous.

**`updateApprovedProductContent`** — POST `/integration/product/sellers/{sellerId}/products/content-bulk-update`
- contentId required — must come from filterApprovedProducts response.
- Partial update supported for title, description, images.
- **If ANY attribute updated → ALL attributes must be sent. No partial attribute update.**
- Cannot update: barcode, productMainId, brandId, categoryId, slicer/varianter attribute values.
- Max 1000 items. Asynchronous.

**`updateApprovedProductVariant`** — POST `/integration/product/sellers/{sellerId}/products/variant-bulk-update`
- barcode is the identifier. Required, must not be blank.
- Updatable: stockCode, vatRate, shipmentAddressId, returningAddressId, dimensionalWeight, lotNumber, locationBasedDelivery.
- **Partial update NOT supported — send all fields every time.**
- locationBasedDelivery: "ENABLED" or "DISABLED".
- Max 1000 items. Asynchronous.

**`updateApprovedProductDelivery`** — POST `/integration/product/sellers/{sellerId}/products/delivery-info-bulk-update`
- barcode is the identifier. Required, must not be blank.
- Updatable: deliveryDuration, fastDeliveryType.
- fastDeliveryType: "SAME_DAY_SHIPPING" or "FAST_DELIVERY".
- Max 1000 items. Asynchronous.

### Critical rules for all update endpoints
- None accept quantity, salePrice, or listPrice — use updatePriceAndInventory for price/stock.
- barcode, productMainId, brandId, categoryId cannot be changed on approved products.
- All are asynchronous and return batchRequestId — always follow with getBatchRequestResult.

---

## inventory_price

**Purpose:** Update stock quantity and pricing for approved products. High-frequency sync module.

### Endpoints

**`updatePriceAndInventory`** — POST `/integration/inventory/sellers/{sellerId}/products/price-and-inventory`

Supports partial update:
- quantity only (barcode + quantity)
- price only (barcode + salePrice + listPrice)
- all three together

At least one of quantity, salePrice, listPrice must be present. barcode always required.

### Business rules
- Only works on approved products.
- **The same request CANNOT be repeated within 15 minutes.** Hard idempotency window.
- Changing any field value resets the 15-minute window.
- Max 1000 items per request.
- Max 20000 stock units per product per request.
- Asynchronous — returns batchRequestId.

Always implement deduplication: track last-sent timestamp and values per barcode. Block repeat requests within 15-minute window.

**Never use product_update endpoints for price or stock changes.**

---

## product_lifecycle

**Purpose:** Operational control of product state.

### Endpoints

**`archiveProducts`** — PUT `/integration/product/sellers/{sellerId}/products/archive-state`
- archived=true → hides from catalog, kept in system
- archived=false → restores the product
- Same endpoint for both. Max 1000 items. Asynchronous.

**`unlockProducts`** — PUT `/integration/product/sellers/{sellerId}/products/unlock`
- For products locked due to: low pricing, high pricing, critical pricing errors, unsupplied reasons.
- barcode required. Asynchronous.

**`deleteProducts`** — DELETE `/integration/product/sellers/{sellerId}/products`
- **Deletion is IRREVERSIBLE.** Always confirm user intent before generating delete code.
- Products awaiting approval: can be deleted anytime.
- Approved products: must be archived >1 day AND not stopped by Trendyol.
- Asynchronous.

### Critical rules
- Archive before delete for approved products: archiveProducts (archived=true) → wait >1 day → deleteProducts.
- All three endpoints are asynchronous and return batchRequestId.

---

## batch_tracking

**Purpose:** Track every asynchronous mutation result. Required after every write operation.

### Endpoints

**`getBatchRequestResult`** — GET `/integration/product/sellers/{sellerId}/products/batch-requests/{batchRequestId}`

### Response fields
- `status` — COMPLETED or IN_PROGRESS (top-level)
- `items[].status` — SUCCESS or FAILED (item-level)
- `items[].failureReasons[]` — failure reason strings
- `items[].requestItem` — original request item
- `batchRequestType` — ProductV2OnBoarding | ProductV2Update | ProductInventoryUpdate | ProductArchiveUpdate | ProductDeletion
- `itemCount`, `failedItemCount`, `creationDate`, `lastModification`, `sourceType`

### Expected batchRequestType per endpoint
- createProducts → ProductV2OnBoarding
- updateUnapprovedProducts, updateApprovedProductContent, updateApprovedProductVariant, updateApprovedProductDelivery → ProductV2Update
- updatePriceAndInventory → ProductInventoryUpdate
- archiveProducts, unlockProducts → ProductArchiveUpdate
- deleteProducts → ProductDeletion

### Critical rules
- **COMPLETED ≠ all items succeeded.** Always inspect item-level status.
- Batch results available for **4 hours only**. Store persistently before expiry.
- Poll every 3-5 seconds. Max 10 attempts.
- After COMPLETED: collect items where status == "FAILED", log failureReasons.
- **Retry only failed items — never retry the entire batch.**
- For updatePriceAndInventory retries: respect the 15-minute idempotency window.

---

## product_search

**Purpose:** Query and filter seller products. Source of contentId for updateApprovedProductContent.

### Endpoints

**`getProductBase`** — GET `/integration/product/sellers/{sellerId}/product/{barcode}`
- Returns: approved, approvedDate, archived, listingId, contentId.
- Use for quick single-product status checks.

**`filterApprovedProducts`** — GET `/integration/product/sellers/{sellerId}/products/approved`
- Content-based structure: each content has a variants array. contentId at content level.
- **Max size: 100 per page** (NOT 1000 — common mistake).
- page × size must not exceed 10000.
- nextPageToken for datasets >10000.
- Status filters: archived, blacklisted, locked, onSale.
- dateQueryType: VARIANT_CREATED_DATE, VARIANT_MODIFIED_DATE, CONTENT_MODIFIED_DATE.
- contentId from here is required for updateApprovedProductContent.

**`filterUnapprovedProducts`** — GET `/integration/product/sellers/{sellerId}/products/unapproved`
- Max size: 1000 per page.
- page × size must not exceed 10000.
- nextPageToken for datasets >10000.
- Status filters: rejected, pendingApproval.
- dateQueryType: CREATED_DATE, LAST_MODIFIED_DATE.
- Response includes rejectReasonDetails for rejected products.

### Critical rules
- filterApprovedProducts max size is 100, not 1000.
- page × size > 10000 rejected by API.
- dateQueryType enum values differ between the two filter endpoints.
- contentId is inside content[] of filterApprovedProducts — must iterate content[] to find it.

---

## buybox (optional)

**Purpose:** Observe competitive market state. Not required for core integration.

### Endpoints

**`getBuyboxInformation`** — POST `/integration/product/sellers/{sellerId}/products/buybox-information`

Request: `{ "barcodes": ["barcode1", ...] }` — max 10 barcodes.

Response per barcode: buyboxOrder (1 = you hold buybox), buyboxPrice, hasMultipleSeller.

### Critical rules
- Max 10 barcodes per request.
- Rate limit: 1000 req/min.
- buyboxOrder=1 → you have the buybox. buyboxOrder>1 → competitor has it.
- Barcodes not found → silently omitted from response.
- Not asynchronous — returns results directly.
