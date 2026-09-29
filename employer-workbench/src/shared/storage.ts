// Validate saved JSON before handing it to module validators or recursive snapshots.
export function restoreStoredValue<T>(
  raw: string | null,
  initial: T,
  validate?: (value: unknown) => boolean
): T {
  if (!raw || raw.length > 1_200_000) return initial;
  try {
    const parsed: unknown = JSON.parse(raw);
    const stack: { value: unknown; depth: number }[] = [
      { value: parsed, depth: 0 },
    ];
    let visited = 0;
    while (stack.length) {
      const item = stack.pop()!;
      if (++visited > 20_000 || item.depth > 32) return initial;
      if (item.value && typeof item.value === 'object') {
        const entries = Object.values(item.value);
        if (visited + stack.length + entries.length > 20_000) return initial;
        for (const value of entries)
          stack.push({ value, depth: item.depth + 1 });
      }
    }
    return !validate || validate(parsed) ? (parsed as T) : initial;
  } catch {
    return initial;
  }
}
