import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, LoginRequest, AuthResponse } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  // حالة المستخدم كـ Signal (Angular 18)
  private readonly currentUserSignal = signal<User | null>(
    this.loadUserFromStorage()
  );
  
  // مشاركة حالة Refresh Token لمنع race conditions
  private refreshTokenInProgress = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentUserSignal());

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials)
      .pipe(
        tap((response) => this.handleAuthSuccess(response)),
        catchError((err) => throwError(() => err))
      );
  }

  logout(): void {
    localStorage.removeItem(environment.tokenKey);
    localStorage.removeItem(environment.refreshTokenKey);
    this.currentUserSignal.set(null);
    this.router.navigate(['/auth/login']);
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem(environment.refreshTokenKey);
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/refresh`, { refreshToken })
      .pipe(tap((res) => this.handleAuthSuccess(res)));
  }

  getAccessToken(): string | null {
    return localStorage.getItem(environment.tokenKey);
  }

  isLoggedIn(): boolean {
    return !!this.getAccessToken();
  }

  get refreshing(): boolean {
    return this.refreshTokenInProgress;
  }

  set refreshing(val: boolean) {
    this.refreshTokenInProgress = val;
  }

  get refreshSubject(): BehaviorSubject<string | null> {
    return this.refreshTokenSubject;
  }

  private handleAuthSuccess(response: AuthResponse): void {
    localStorage.setItem(environment.tokenKey, response.accessToken);
    localStorage.setItem(environment.refreshTokenKey, response.refreshToken);
    this.currentUserSignal.set(response.user);
  }

  private loadUserFromStorage(): User | null {
    try {
      const token = localStorage.getItem(environment.tokenKey);
      if (!token) return null;
      // في الإنتاج: فكّ ترميز JWT وأعد كائن User
      return {
        id: '1',
        name: 'محمد الفاتح',
        email: 'admin@taqseet.sa',
        role: 'admin',
        avatar: 'م ف',
        permissions: ['all'],
      };
    } catch {
      return null;
    }
  }
}
