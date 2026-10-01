# Security Specification - OmniPOS Retail

## 1. Data Invariants
- Products must possess a valid identifier, name, non-negative priceUSD, and numeric stock.
- Sales require a unique invoice number, total amount, and valid status ('completed' or 'cancelled').
- Customers and Suppliers must have a non-empty name and tax identification (RIF/CI/DNI).
- Store settings can only be altered by authenticated administrative staff.
- Deletions of sales and purchases are prohibited to ensure audit trail immutability.

## 2. The "Dirty Dozen" Payloads (Designed to be Rejected)
1. Shadow update with ghost fields on products (`isHacked: true`).
2. Negative product price (`priceUSD: -50`).
3. Excessive string length in product name (> 200 chars).
4. Sale without invoiceNumber.
5. Injected SQL/NoSQL payload in document ID (`../../../evil`).
6. Unauthenticated customer creation.
7. Spoofed admin claim write.
8. Deletion of sales audit records.
9. Modifying completed sale status to arbitrary status.
10. Unbounded massive payload in customer address (> 2KB).
11. Negative exchangeRate in store settings.
12. Anonymous unverified user modifying inventory stock.

## 3. Test Coverage Summary
- Read operations allowed for authenticated staff.
- Writes validated strictly by schema helpers `isValidProduct`, `isValidSale`, `isValidCustomer`, `isValidSupplier`, `isValidPurchase`, `isValidSettings`.
- Catch-all default deny on all other paths.
