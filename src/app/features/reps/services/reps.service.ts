import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Rep } from '../models/rep.model';
import { generateUUID } from '../../../shared/utils/uuid.util';

@Injectable({ providedIn: 'root' })
export class RepsService {

  getAll(): Observable<Rep[]> {
    return of([...MOCK_REPS]).pipe(delay(200));
  }

  create(rep: Omit<Rep, 'id'>): Observable<Rep> {
    const newRep: Rep = { ...rep, id: generateUUID() };
    MOCK_REPS.unshift(newRep);
    return of(newRep).pipe(delay(350));
  }

  update(id: string, data: Partial<Rep>): Observable<Rep> {
    const idx = MOCK_REPS.findIndex(r => r.id === id);
    if (idx !== -1) MOCK_REPS[idx] = { ...MOCK_REPS[idx], ...data };
    return of(MOCK_REPS[idx]).pipe(delay(300));
  }

  delete(id: string): Observable<void> {
    MOCK_REPS = MOCK_REPS.filter(r => r.id !== id);
    return of(undefined).pipe(delay(200));
  }
}

let MOCK_REPS: Rep[] = [
  {
    id: '1', name: 'أحمد سالم', phone: '0501234567',
    permissions: 'full', commissionRate: 5,
    monthlySales: 48000, commission: 2400, treasuryBalance: 1200,
    rating: 5, status: 'active',
  },
  {
    id: '2', name: 'محمد عبدالله', phone: '0556789012',
    permissions: 'create', commissionRate: 4,
    monthlySales: 32000, commission: 1280, treasuryBalance: 640,
    rating: 4, status: 'active',
  },
  {
    id: '3', name: 'عبدالرحمن نصر', phone: '0509876543',
    permissions: 'view', commissionRate: 3,
    monthlySales: 15000, commission: 450, treasuryBalance: 225,
    rating: 3, status: 'leave',
  },
];
