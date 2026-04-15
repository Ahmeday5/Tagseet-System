import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { SystemUser } from '../models/user-management.model';
import { generateUUID } from '../../../shared/utils/uuid.util';
// import { ApiService } from '../../../core/services/api.service'; // فعّل عند ربط API

@Injectable({ providedIn: 'root' })
export class UsersService {
  // private readonly api = inject(ApiService);

  getAll(): Observable<SystemUser[]> {
    // استبدل بـ: return this.api.get<SystemUser[]>('users');
    return of([...MOCK_USERS]).pipe(delay(200));
  }

  getById(id: string): Observable<SystemUser> {
    const found = MOCK_USERS.find((u) => u.id === id);
    return found
      ? of(found).pipe(delay(150))
      : throwError(() => new Error('المستخدم غير موجود'));
  }

  create(data: Omit<SystemUser, 'id' | 'createdAt' | 'lastLogin'>): Observable<SystemUser> {
    const newUser: SystemUser = {
      ...data,
      id: generateUUID(),
      createdAt: new Date().toISOString().split('T')[0],
      lastLogin: null,
    };
    MOCK_USERS.unshift(newUser);
    return of(newUser).pipe(delay(400));
  }

  update(id: string, data: Partial<SystemUser>): Observable<SystemUser> {
    const idx = MOCK_USERS.findIndex((u) => u.id === id);
    if (idx === -1) return throwError(() => new Error('المستخدم غير موجود'));
    MOCK_USERS[idx] = { ...MOCK_USERS[idx], ...data };
    return of(MOCK_USERS[idx]).pipe(delay(400));
  }

  delete(id: string): Observable<void> {
    const idx = MOCK_USERS.findIndex((u) => u.id === id);
    if (idx !== -1) MOCK_USERS.splice(idx, 1);
    return of(undefined).pipe(delay(300));
  }
}

let MOCK_USERS: SystemUser[] = [
  {
    id: '1', name: 'محمد الفاتح',    email: 'admin@taqseet.sa',   role: 'admin',
    permissions: ['all'],             isActive: true, lastLogin: '2025-04-08T09:30:00', createdAt: '2023-01-01',
  },
  {
    id: '2', name: 'سلمى المنصور',   email: 'manager@taqseet.sa', role: 'manager',
    permissions: ['customers.view', 'customers.create', 'customers.edit', 'catalog.view', 'reports.view'],
    isActive: true, lastLogin: '2025-04-07T14:00:00', createdAt: '2023-06-01',
  },
  {
    id: '3', name: 'يعقوب الحارثي',  email: 'cashier@taqseet.sa', role: 'cashier',
    permissions: ['customers.view', 'treasury.view'],
    isActive: true, lastLogin: '2025-04-08T08:00:00', createdAt: '2024-01-15',
  },
  {
    id: '4', name: 'رنا السبيعي',    email: 'viewer@taqseet.sa',  role: 'viewer',
    permissions: ['customers.view', 'reports.view'],
    isActive: false, lastLogin: null, createdAt: '2024-03-01',
  },
];
