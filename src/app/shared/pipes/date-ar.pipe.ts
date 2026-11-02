import { Pipe, PipeTransform } from '@angular/core';

import { formatCairoDateTime } from '../utils/date-iso.util';

@Pipe({ name: 'dateAr', standalone: true })
export class DateArPipe implements PipeTransform {
  private readonly months = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
  ];

  /** `dateTime` treats string input as UTC and renders it in Cairo time. */
  transform(
    value: string | Date | null | undefined,
    format: 'short' | 'long' | 'dateTime' = 'long',
  ): string {
    if (!value) return '—';
    if (format === 'dateTime') {
      return formatCairoDateTime(typeof value === 'string' ? value : value.toISOString());
    }
    const date = typeof value === 'string' ? new Date(value) : value;
    if (isNaN(date.getTime())) return '—';

    const d = date.getDate();
    const m = this.months[date.getMonth()];
    const y = date.getFullYear();

    return format === 'short' ? `${d}/${date.getMonth() + 1}/${y}` : `${d} ${m} ${y}`;
  }
}
