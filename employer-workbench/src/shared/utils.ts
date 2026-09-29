import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { restoreStoredValue } from './storage';

export function usePersistedState<T>(
  key: string,
  initial: T,
  validate?: (value: unknown) => boolean
): [T, Dispatch<SetStateAction<T>>, string] {
  const storageKey = `kwon-workbench:v1:${key}`;
  const [notice, setNotice] = useState('');
  const [value, setValue] = useState<T>(() => {
    try {
      return restoreStoredValue(
        localStorage.getItem(storageKey),
        initial,
        validate
      );
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
      setNotice('');
    } catch {
      setNotice(
        '이 브라우저에서 저장할 수 없어 현재 화면에만 보관됩니다. 결과를 내려받아 보관하세요.'
      );
    }
  }, [storageKey, value]);
  return [value, setValue, notice];
}

export function downloadText(
  filename: string,
  content: string,
  type = 'text/plain;charset=utf-8'
): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadJson(filename: string, value: unknown): void {
  downloadText(
    filename,
    JSON.stringify(value, null, 2),
    'application/json;charset=utf-8'
  );
}

export function csvCell(value: unknown): string {
  let text = value == null ? '' : String(value);
  if (typeof value === 'string' && /^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function downloadCsv(
  filename: string,
  rows: Record<string, unknown>[]
): void {
  const keys = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  const body = [
    keys.map(csvCell).join(','),
    ...rows.map(row => keys.map(key => csvCell(row[key])).join(',')),
  ].join('\r\n');
  downloadText(filename, `\uFEFF${body}`, 'text/csv;charset=utf-8');
}

export function formatNumber(value: number, digits = 0): string {
  return Number.isFinite(value)
    ? value.toLocaleString('ko-KR', { maximumFractionDigits: digits })
    : '—';
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([a], [b]) => a.localeCompare(b)
  );
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(',')}}`;
}

/** A local change marker, not a cryptographic signature or identity proof. */
export function fingerprint(value: unknown): string {
  const input = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : '처리하지 못했습니다. 입력을 확인하세요.';
}
