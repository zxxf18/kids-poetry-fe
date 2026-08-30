import type { PoemListItem } from '@/lib/poetry';

const HOME_STATE_KEY = 'poetry-home-state-v1';
const READER_CONTEXT_KEY = 'poetry-reader-context-v1';

export type HomeState = {
  filters: Record<string, string>;
  draft: string;
  titleDraft: string;
  authorDraft: string;
  items: PoemListItem[];
  total: number;
  page: number;
  hasMore: boolean;
  scrollY: number;
  returnHref: string;
  savedAt: number;
};

export type ReaderContext =
  | {
      mode: 'list';
      poemIds: string[];
      currentId: string;
      returnHref: string;
    }
  | {
      mode: 'random';
      currentId: string;
      returnHref: string;
    };

export function saveHomeState(state: HomeState) {
  sessionStorage.setItem(HOME_STATE_KEY, JSON.stringify(state));
}

export function readHomeState(): HomeState | null {
  return readSessionValue<HomeState>(HOME_STATE_KEY);
}

export function saveReaderContext(context: ReaderContext) {
  sessionStorage.setItem(READER_CONTEXT_KEY, JSON.stringify(context));
}

export function readReaderContext(): ReaderContext | null {
  return readSessionValue<ReaderContext>(READER_CONTEXT_KEY);
}

export function clearReaderContext() {
  sessionStorage.removeItem(READER_CONTEXT_KEY);
}

function readSessionValue<T>(key: string): T | null {
  try {
    return JSON.parse(sessionStorage.getItem(key) || 'null') as T | null;
  } catch {
    return null;
  }
}
