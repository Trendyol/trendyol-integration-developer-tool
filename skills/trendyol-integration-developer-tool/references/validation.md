# Validation Reference

## When to call which validator

| Situation | Tool |
|---|---|
| Creating products (full request) | `validateRequest` (preferred, with marketplace) |
| Creating products (body only) | `validatePayload` (with marketplace) |
| Updating unapproved products | `validateRequest` (with marketplace) |
| Updating approved products | `validateRequest` (with marketplace) |
| Product attributes vs category definition | `validateProductAgainstCategoryAttributes` |
| Price/inventory payload | `validateRequest` |
| Filter query parameters | `validateRequest` |
| Known-valid example | `generateExampleRequest` |
| Edge cases including invalid | `generateTestFixtures` |

Always prefer `validateRequest` over `validatePayload` when all request components are available. Always pass `marketplace` explicitly.

---

## Error structure

Each error and warning has three fields:
- `path` — location of the issue (e.g., `items[0].vatRate`, `pathParams.sellerId`, `headers.Authorization`)
- `code` — machine-readable identifier
- `message` — human-readable description

---

## validateRequest / validatePayload error codes

| Code | Meaning | Fix |
|---|---|---|
| `MISSING_REQUIRED_FIELD` | Required field absent | Add the field |
| `TYPE_MISMATCH` | Wrong type | Fix the type |
| `ENUM_MISMATCH` | Value not in allowed enum | Use one of the allowed values |
| `INVALID_VAT_RATE` | vatRate not in marketplace enum | TR: 0, 1, 10, or 20. GLOBAL: country-specific |
| `MAX_LENGTH_EXCEEDED` | String or array too long | Shorten or reduce |
| `MAX_ITEMS_EXCEEDED` | Array too many items | Split into multiple requests |
| `MAXIMUM_EXCEEDED` | Numeric value too large | Reduce |
| `INVALID_PRICE_RELATION` | listPrice < salePrice | Ensure listPrice >= salePrice |
| `INVALID_DELIVERY_DURATION` | deliveryDuration ≠ 1 when fastDeliveryType set | Set deliveryDuration to 1 |
| `DUPLICATE_BARCODES` | Same barcode twice in batch | Remove duplicates |
| `DUPLICATE_CONTENT_IDS` | Same contentId twice | Remove duplicates |
| `MISSING_REQUEST_BODY` | Body required but absent | Add body |
| `MISSING_REQUIRED_PATH_PARAM` | Required path param missing | Add param |
| `MISSING_REQUIRED_QUERY_PARAM` | Required query param missing | Add param |
| `INVALID_PATH_PARAM_TYPE` | Path param wrong type | Fix type |
| `INVALID_SELLER_ID` | sellerId not positive integer | Use positive integer |
| `INVALID_AUTHORIZATION_FORMAT` | Authorization not starting with "Basic " | Use "Basic base64(apiKey:apiSecret)" |
| `EMPTY_AUTHORIZATION_CREDENTIALS` | "Basic " present but no credentials | Add encoded credentials |
| `INVALID_SUPPLIER_ID_FORMAT` | X-Supplier-Id not numeric | Use numeric string |
| `MISSING_REQUIRED_HEADER` | Required header absent | Add header |
| `QUERY_PARAM_EXCEEDS_MAXIMUM` | Query param value too large | Reduce to within maximum |
| `NO_MUTABLE_FIELD` | updatePriceAndInventory item has only barcode | Add quantity, salePrice, or listPrice |
| `QUANTITY_EXCEEDS_LIMIT` | quantity > 20000 | Reduce to max 20000 |
| `INVALID_BARCODE` | Barcode blank or invalid | Use non-blank string |
| `EMPTY_ITEMS_ARRAY` | items array empty | Add at least one item |
| `TOO_MANY_BARCODES` | getBuyboxInformation has >10 barcodes | Split into batches of max 10 |

## validateRequest / validatePayload warning codes

| Code | Meaning | Action |
|---|---|---|
| `IMAGE_URL_NOT_HTTPS` | Image URL uses HTTP | Change to HTTPS |
| `EMPTY_ATTRIBUTES_ARRAY` | Attributes array empty | Likely missing required category attributes |
| `BARCODE_INVALID_CHARACTERS` | Barcode has unusual characters | Check allowed set: `.` `-` `_` |
| `ATTRIBUTE_VALUE_MISSING` | Attribute has no value | Provide attributeValueIds or attributeValue |
| `ATTRIBUTE_VALUE_AMBIGUOUS` | Both attributeValueIds and attributeValue sent | Use only one |
| `WRONG_ATTRIBUTE_FORMAT_FOR_CREATE` | Update format used in createProducts | Use attributeValueId (singular) + customAttributeValue |
| `WRONG_ATTRIBUTE_FORMAT_FOR_UPDATE` | createProducts format used in update endpoint | Use attributeValueIds (array) + attributeValue |
| `MISSING_CREDENTIAL_HEADER` | Authorization or X-Supplier-Id absent | Add before real execution |
| `IMMUTABLE_FIELD_WARNING` | Trying to update a field that cannot change on approved products | Remove or accept it will be ignored |
| `ATTRIBUTES_FULL_SEND_REQUIRED` | Reminder: all attributes must be sent if any is updated | Include all attributes |
| `UPSTREAM_DEPENDENCY_RULE` | Reminder: IDs must come from catalog endpoints | Resolve from getBrands/getCategoryTree/etc. |
| `PAGE_SIZE_PRODUCT_EXCEEDS_LIMIT` | page × size > 10000 | Reduce page or size |
| `UNKNOWN_QUERY_PARAM` | Query param not in endpoint schema | Remove or verify |
| `UNEXPECTED_HEADER_VALUE` | Header has unexpected value | Verify header value |
| `BLANK_STRING` | String field blank after trim | Provide non-blank value |

---

## validateProductAgainstCategoryAttributes error codes

| Code | Meaning | Fix |
|---|---|---|
| `MISSING_REQUIRED_ATTRIBUTE` | Required category attribute not in product | Add attribute with value |
| `REQUIRED_ATTRIBUTE_VALUE_MISSING` | Required attribute present but no value | Provide attributeValueIds or attributeValue |
| `CUSTOM_VALUE_NOT_ALLOWED` | Free-text where allowCustom=false | Use predefined IDs from getCategoryAttributeValues |
| `MULTIPLE_VALUES_NOT_ALLOWED` | Multiple IDs where allowMultipleAttributeValues=false | Reduce to exactly one ID |

## validateProductAgainstCategoryAttributes warning codes

| Code | Meaning | Action |
|---|---|---|
| `UNKNOWN_ATTRIBUTE` | attributeId not in category definition | Verify getCategoryAttributes for this categoryId |
| `VALUE_IDS_WITH_ALLOW_CUSTOM` | Predefined IDs where allowCustom=true | Consider using free-text value instead |
| `MISSING_VARIANTER_ATTRIBUTE` | Varianter attribute absent | Add for correct variant grouping |
| `MISSING_SLICER_ATTRIBUTE` | Slicer attribute absent | Add for correct catalog card separation |
| `ATTRIBUTE_VALUE_MISSING` | Attribute present but no value | Provide a value |
| `EMPTY_CATEGORY_ATTRIBUTES` | Category has no defined attributes | No attribute validation possible |

When presenting these errors, always explain:
- What the category expects (from attribute definition)
- What the product is currently providing
- The exact fix required

---

## Endpoint selection mistakes to avoid

| Wrong | Correct | Why |
|---|---|---|
| updateProduct (any use) | V2 update endpoints | V1 deprecated |
| updateApprovedProductContent for price/stock | updatePriceAndInventory | Content endpoints don't accept price/stock |
| updatePriceAndInventory for metadata | updateApprovedProductContent or updateUnapprovedProducts | Price endpoint doesn't accept metadata |
| createProducts for existing products | Appropriate update endpoint | createProducts is for new products only |
| filterProducts | filterApprovedProducts or filterUnapprovedProducts | filterProducts does not exist |
| Parent category ID | Leaf (lowest-level) category ID | Parent categories rejected |
| Partial attributes in content update | ALL attributes when any attribute changes | No partial attribute update |
| Repeating updatePriceAndInventory within 15 min | Implement deduplication | Hard idempotency window |
| TR vatRate for GLOBAL | Country-specific vatRate | Different VAT rules per marketplace |
| Mixed attribute formats | createProducts: attributeValueId singular. Updates: attributeValueIds array | Different formats for different endpoint groups |
