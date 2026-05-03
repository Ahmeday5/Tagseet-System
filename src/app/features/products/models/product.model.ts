/**
 * Product entity exactly as returned by `GET /dashboard/products`.
 * No separate "view" DTO — the API shape *is* the view model.
 *
 * `imageUrl` is a server-relative path like `/Images/Products/<file>`.
 * Use `buildImageUrl()` from `../utils/product-image.util` to turn it
 * into an absolute URL for the `<img>` src.
 *
 * The four collection fields come back as empty arrays today; typed as
 * optional unknown[] so they can be specialized later without breaking
 * existing call-sites.
 */
export interface Product {
  id: number;
  name: string;
  description: string;
  purchasePrice: number;
  sellingPrice: number;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  inventoryBalances?: unknown[];
  inventoryTransactions?: unknown[];
  contracts?: unknown[];
  supplierPurchaseInvoiceItems?: unknown[];
}

/**
 * Plain input shape coming out of the form. The service serializes this
 * into multipart/form-data before posting.
 *
 *   - `image` is the picked File (or null = keep the existing image on edit
 *     / send no image on create).
 */
export interface ProductFormInput {
  name: string;
  description: string;
  purchasePrice: number;
  sellingPrice: number;
  isActive: boolean;
  image: File | null;
}
