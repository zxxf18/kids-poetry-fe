export type FacetValue = { value: string; count: number };

export type Facets = {
  dynasties?: FacetValue[];
  forms?: FacetValue[];
  cipais?: FacetValue[];
  authors?: FacetValue[];
  themes?: FacetValue[];
  collections?: FacetValue[];
};

export type PoemListItem = {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  kind: string;
  form: string;
  cipai?: string;
  excerpt: string;
  themes: string[];
  collections: string[];
  ageMin: number;
  ageMax: number;
  hasPinyin: boolean;
  hasTranslation: boolean;
  hasAnnotations: boolean;
  popularScore: number;
};

export type PoemDetail = {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  kind: string;
  form: string;
  cipai?: string;
  lines: string[];
  pinyin: string[];
  translation: string;
  annotations: string[];
  appreciation?: string;
  themes: string[];
  collections: string[];
  ageMin: number;
  ageMax: number;
};

export const API = '/poetry/api/v1';

export async function getJSON<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`请求失败（${response.status}）`);
  return response.json() as Promise<T>;
}

export function readFavorites(): string[] {
  try {
    return JSON.parse(
      localStorage.getItem('kids-poetry-favorites') || '[]',
    ) as string[];
  } catch {
    return [];
  }
}

export function updateFavorite(ids: string[], id: string): string[] {
  const next = ids.includes(id)
    ? ids.filter((item) => item !== id)
    : [...ids, id];
  localStorage.setItem('kids-poetry-favorites', JSON.stringify(next));
  return next;
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value);
}
