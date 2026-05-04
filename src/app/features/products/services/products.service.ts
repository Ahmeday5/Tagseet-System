import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints.const';
import { PagedQuery, PagedResponse } from '../../../core/models/api-response.model';
import {
  withCache,
  withCacheBypass,
  withCacheInvalidate,
  withInlineHandling,
} from '../../../core/http/http-context.tokens';
import { Product, ProductFormInput } from '../models/product.model';

const PRODUCTS_CACHE_KEY = 'product';
const PRODUCTS_TTL_MS = 5 * 60 * 1000; // 5 min — list changes when stock / price / category edits land
/** Page size for the flat-list dropdown variant (e.g. invoice form). */
const FLAT_LIST_PAGE_SIZE = 500;

export interface ProductsListQuery extends PagedQuery {
  categoryId?: number | '' | null;
}

/**
 * `/dashboard/products` facade.
 *
 *   - reads paginate (server-side `pageIndex` / `pageSize` + `search` +
 *     `categoryId` filter), with a 5-min cache that's force-refreshable
 *   - mutations go out as `multipart/form-data` so the picked image
 *     file is uploaded in the same request (the API expects this —
 *     JSON bodies are not accepted on POST/PUT)
 *   - successful mutations invalidate every cached `product` URL,
 *     so the list re-fetches naturally next time someone asks for it
 */
@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly api = inject(ApiService);

  // ─────────── paginated reads ───────────

  list(query: ProductsListQuery = {}): Observable<PagedResponse<Product>> {
    return this.api.get<PagedResponse<Product>>(API_ENDPOINTS.products.base, {
      params: this.toParams(query),
      context: withCache({ ttlMs: PRODUCTS_TTL_MS }),
    });
  }

  refreshList(query: ProductsListQuery = {}): Observable<PagedResponse<Product>> {
    return this.api.get<PagedResponse<Product>>(API_ENDPOINTS.products.base, {
      params: this.toParams(query),
      context: withCacheBypass(withCache({ ttlMs: PRODUCTS_TTL_MS })),
    });
  }

  /** Flat list for dropdowns (invoice form, catalog, etc.). */
  listAll(): Observable<Product[]> {
    return this.list({ pageIndex: 1, pageSize: FLAT_LIST_PAGE_SIZE }).pipe(
      map((res) => Array.isArray(res?.data) ? res.data : []),
    );
  }

  getById(id: number): Observable<Product> {
    return this.api.get<Product>(API_ENDPOINTS.products.byId(id), {
      context: withCache({ ttlMs: PRODUCTS_TTL_MS }),
    });
  }

  // ─────────── mutations (multipart + cache invalidate) ───────────

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

  // ─────────── internals ───────────

  private toParams(query: ProductsListQuery): Record<string, unknown> {
    return {
      PageIndex: query.pageIndex ?? 1,
      PageSize: query.pageSize ?? 10,
      search: query.search ?? '',
      categoryId: query.categoryId ?? '',
    };
  }

  /**
   * Serializes the form input into the exact multipart shape the API
   * expects (PascalCase field names, numbers/booleans as strings).
   *
   * `Image` is appended only when the user actually picked a file —
   * appending an empty string would let ASP.NET model-bind it as a
   * blank file and overwrite the existing image on edit.
   *
   * `CategoryId` is appended only when set; sending an empty string
   * for an int field is a 400 from the model binder.
   */
  private buildFormData(input: ProductFormInput): FormData {
    const fd = new FormData();
    fd.append('Name', input.name.trim());
    fd.append('Description', input.description.trim());
    fd.append('PurchasePrice', String(input.purchasePrice));
    fd.append('SellingPrice', String(input.sellingPrice));
    fd.append('IsActive', String(input.isActive));
    if (input.categoryId !== null && input.categoryId !== undefined) {
      fd.append('CategoryId', String(input.categoryId));
    }
    if (input.image) {
      fd.append('Image', input.image, input.image.name);
    }
    return fd;
  }
}
