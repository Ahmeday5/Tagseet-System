import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints.const';
import {
  withCache,
  withCacheBypass,
  withCacheInvalidate,
  withInlineHandling,
} from '../../../core/http/http-context.tokens';
import { Product, ProductFormInput } from '../models/product.model';

const PRODUCTS_CACHE_KEY = 'product';
const PRODUCTS_TTL_MS = 15 * 60 * 1000; // 15 min

/**
 * CRUD facade for `/dashboard/products`.
 *
 *   - reads are JSON, cached for 15 min, force-refreshable
 *   - writes go out as `multipart/form-data` so the picked image file
 *     is uploaded in the same request (the API expects this — JSON
 *     bodies are not accepted on POST/PUT)
 *   - successful mutations invalidate every cached `product` URL,
 *     so the list re-fetches naturally next time someone asks for it.
 */
@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly api = inject(ApiService);

  // ─────────────── reads (cached) ───────────────

  list(): Observable<Product[]> {
    return this.api.get<Product[]>(API_ENDPOINTS.products.base, {
      context: withCache({ ttlMs: PRODUCTS_TTL_MS }),
    });
  }

  /** Force-refresh, bypassing any cached entry. */
  refreshList(): Observable<Product[]> {
    return this.api.get<Product[]>(API_ENDPOINTS.products.base, {
      context: withCacheBypass(withCache({ ttlMs: PRODUCTS_TTL_MS })),
    });
  }

  getById(id: number): Observable<Product> {
    return this.api.get<Product>(API_ENDPOINTS.products.byId(id), {
      context: withCache({ ttlMs: PRODUCTS_TTL_MS }),
    });
  }

  // ─────────────── mutations (multipart + cache invalidate) ───────────────

  create(input: ProductFormInput): Observable<Product> {
    return this.api.post<Product>(
      API_ENDPOINTS.products.base,
      this.buildFormData(input),
      {
        context: withInlineHandling(withCacheInvalidate([PRODUCTS_CACHE_KEY])),
      },
    );
  }

  update(id: number, input: ProductFormInput): Observable<Product> {
    return this.api.put<Product>(
      API_ENDPOINTS.products.byId(id),
      this.buildFormData(input),
      {
        context: withInlineHandling(withCacheInvalidate([PRODUCTS_CACHE_KEY])),
      },
    );
  }

  delete(id: number): Observable<{ message: string }> {
    return this.api.delete<{ message: string }>(
      API_ENDPOINTS.products.byId(id),
      {
        context: withCacheInvalidate([PRODUCTS_CACHE_KEY]),
      },
    );
  }

  // ─────────────── internals ───────────────

  /**
   * Serializes the form input into the exact multipart shape the API
   * expects (PascalCase field names, numbers/booleans as strings).
   *
   * `Image` is appended only when the user actually picked a file —
   * appending an empty string would let ASP.NET model-bind it as a
   * blank file and overwrite the existing image on edit.
   */
  private buildFormData(input: ProductFormInput): FormData {
    const fd = new FormData();
    fd.append('Name', input.name.trim());
    fd.append('Description', input.description.trim());
    fd.append('PurchasePrice', String(input.purchasePrice));
    fd.append('SellingPrice', String(input.sellingPrice));
    fd.append('IsActive', String(input.isActive));
    if (input.image) {
      fd.append('Image', input.image, input.image.name);
    }
    return fd;
  }
}
