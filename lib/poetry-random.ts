import type { PoemListItem } from '@/lib/poetry';

const RECENT_RANDOM_KEY = 'poetry-recent-random-v2';
const RECENT_RANDOM_LIMIT = 60;

export function chooseFreshPoem<T extends Pick<PoemListItem, 'id'>>(
  candidates: T[],
): T | undefined {
  if (candidates.length === 0) return undefined;
  const recent = readRecentRandom();
  const poem = candidates.find((candidate) => !recent.includes(candidate.id)) ||
    candidates[0];
  const next = [poem.id, ...recent.filter((id) => id !== poem.id)].slice(
    0,
    RECENT_RANDOM_LIMIT,
  );
  try {
    sessionStorage.setItem(RECENT_RANDOM_KEY, JSON.stringify(next));
  } catch {
    // A disabled session store should not prevent reading a random poem.
  }
  return poem;
}

function readRecentRandom(): string[] {
  try {
    const value = JSON.parse(
      sessionStorage.getItem(RECENT_RANDOM_KEY) || '[]',
    ) as unknown;
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}
