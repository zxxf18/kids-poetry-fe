import type { PoemListItem } from '@/lib/poetry';

const HOME_STATE_KEY = 'poetry-home-state-v2';
const READER_CONTEXT_KEY = 'poetry-reader-context-v1';
const NAVIGATION_DB = 'kids-poetry-navigation';
const NAVIGATION_STORE = 'snapshots';
let homeStateMemory: HomeState | null = null;

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
  anchorId?: string;
  anchorOffset?: number;
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

export async function saveHomeState(state: HomeState) {
  homeStateMemory = state;
  try {
    sessionStorage.setItem(HOME_STATE_KEY, JSON.stringify(state));
  } catch {
    sessionStorage.removeItem(HOME_STATE_KEY);
  }
  await writeIndexedState(state);
}

export async function readHomeState(): Promise<HomeState | null> {
  const fastState =
    homeStateMemory || readSessionValue<HomeState>(HOME_STATE_KEY);
  return fastState || readIndexedState();
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

function openNavigationDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open(NAVIGATION_DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(NAVIGATION_STORE)) {
        request.result.createObjectStore(NAVIGATION_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function writeIndexedState(state: HomeState): Promise<void> {
  const database = await openNavigationDB();
  if (!database) return;
  await new Promise<void>((resolve) => {
    const transaction = database.transaction(NAVIGATION_STORE, 'readwrite');
    transaction.objectStore(NAVIGATION_STORE).put(state, HOME_STATE_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
  database.close();
}

async function readIndexedState(): Promise<HomeState | null> {
  const database = await openNavigationDB();
  if (!database) return null;
  const state = await new Promise<HomeState | null>((resolve) => {
    const transaction = database.transaction(NAVIGATION_STORE, 'readonly');
    const request = transaction
      .objectStore(NAVIGATION_STORE)
      .get(HOME_STATE_KEY);
    request.onsuccess = () => resolve((request.result as HomeState) || null);
    request.onerror = () => resolve(null);
  });
  database.close();
  return state;
}
