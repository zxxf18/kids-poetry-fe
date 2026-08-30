'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookHeart,
  BookOpenText,
  Check,
  ChevronRight,
  Compass,
  Heart,
  LoaderCircle,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type FacetValue = { value: string; count: number };
type Facets = {
  dynasties?: FacetValue[];
  forms?: FacetValue[];
  cipais?: FacetValue[];
  authors?: FacetValue[];
  themes?: FacetValue[];
  collections?: FacetValue[];
};
type PoemListItem = {
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
  hasTranslation: boolean;
  popularScore: number;
};
type PoemDetail = PoemListItem & {
  lines: string[];
  pinyin: string[];
  translation: string;
  annotations: string[];
  appreciation?: string;
  source: { name: string; url: string; commit: string; licenseNote: string };
};
type SearchFilters = {
  q: string;
  dynasty: string;
  author: string;
  title: string;
  kind: string;
  form: string;
  theme: string;
  cipai: string;
  collection: string;
};

const API = '/poetry/api/v1';
const emptyFilters: SearchFilters = {
  q: '',
  dynasty: '',
  author: '',
  title: '',
  kind: '',
  form: '',
  theme: '',
  cipai: '',
  collection: '',
};
const collectionNames: Record<string, string> = {
  'widely-known': '流传最广',
  'primary-school': '小学精选',
  'classic-anthology': '经典选本',
  'first-poems': '初识古诗',
};
const fallbackFeatured: PoemListItem[] = [
  {
    id: 'preview-jingyesi',
    title: '静夜思',
    author: '李白',
    dynasty: '唐',
    kind: 'poem',
    form: '五言绝句',
    excerpt: '床前明月光，疑是地上霜。',
    themes: ['月夜', '思乡'],
    collections: ['widely-known'],
    ageMin: 6,
    ageMax: 9,
    hasTranslation: true,
    popularScore: 100,
  },
  {
    id: 'preview-dengguanquelou',
    title: '登鹳雀楼',
    author: '王之涣',
    dynasty: '唐',
    kind: 'poem',
    form: '五言绝句',
    excerpt: '白日依山尽，黄河入海流。',
    themes: ['山水'],
    collections: ['widely-known'],
    ageMin: 6,
    ageMax: 9,
    hasTranslation: true,
    popularScore: 99,
  },
  {
    id: 'preview-shuidiaogetou',
    title: '水调歌头',
    author: '苏轼',
    dynasty: '宋',
    kind: 'ci',
    form: '词',
    cipai: '水调歌头',
    excerpt: '明月几时有？把酒问青天。',
    themes: ['月夜'],
    collections: ['widely-known'],
    ageMin: 10,
    ageMax: 14,
    hasTranslation: true,
    popularScore: 98,
  },
];

async function getJSON<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`请求失败（${response.status}）`);
  return response.json() as Promise<T>;
}

function makeParams(filters: SearchFilters, page = 1) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: '18',
    hasTranslation: 'true',
  });
  Object.entries(filters).forEach(
    ([key, value]) => value && params.set(key, value),
  );
  return params;
}

function toneFor(index: number) {
  return ['apricot', 'sage', 'gold', 'rose'][index % 4];
}

export default function Home() {
  const [draft, setDraft] = useState('');
  const [filters, setFilters] = useState<SearchFilters>(emptyFilters);
  const [facets, setFacets] = useState<Facets>({});
  const [featured, setFeatured] = useState<PoemListItem[]>(fallbackFeatured);
  const [items, setItems] = useState<PoemListItem[]>(fallbackFeatured);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<PoemDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showPinyin, setShowPinyin] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    try {
      setFavorites(
        JSON.parse(localStorage.getItem('kids-poetry-favorites') || '[]'),
      );
    } catch {
      setFavorites([]);
    }
    const controller = new AbortController();
    Promise.all([
      getJSON<Facets>('/facets', controller.signal),
      getJSON<{ items: PoemListItem[] }>(
        '/featured?collection=widely-known&limit=6',
        controller.signal,
      ),
    ])
      .then(([facetData, featuredData]) => {
        setFacets(facetData);
        if (featuredData.items.length) setFeatured(featuredData.items);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const loadPoems = useCallback(
    async (nextPage: number, append = false, signal?: AbortSignal) => {
      setLoading(true);
      setError('');
      try {
        const data = await getJSON<{
          items: PoemListItem[];
          total: number;
          hasMore: boolean;
        }>(`/poems?${makeParams(filters, nextPage)}`, signal);
        setItems((current) =>
          append ? [...current, ...data.items] : data.items,
        );
        setTotal(data.total);
        setHasMore(data.hasMore);
        setPage(nextPage);
      } catch (reason) {
        if ((reason as Error).name !== 'AbortError') {
          setError('诗词书库暂时没有打开，请稍后再试。');
          if (!append) setItems([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadPoems(1, false, controller.signal);
    return () => controller.abort();
  }, [loadPoems]);

  const setFilter = (key: keyof SearchFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const search = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    setFilter('q', draft.trim());
    document
      .getElementById('library')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const quickSearch = (q: string) => {
    setDraft(q);
    setFilters({ ...emptyFilters, q });
    document
      .getElementById('library')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openPoem = async (poem: PoemListItem) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      setDetail(
        await getJSON<PoemDetail>(`/poems/${encodeURIComponent(poem.id)}`),
      );
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleFavorite = (id: string) => {
    const next = favorites.includes(id)
      ? favorites.filter((item) => item !== id)
      : [...favorites, id];
    setFavorites(next);
    localStorage.setItem('kids-poetry-favorites', JSON.stringify(next));
  };

  const activeCount = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters],
  );
  const today = featured[0] || fallbackFeatured[0];

  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="童诗小书房首页">
          <span className="brand-seal">诗</span>
          <span>童诗小书房</span>
        </Link>
        <nav className="main-nav" aria-label="主导航">
          <a className="active" href="#discover">
            发现
          </a>
          <a href="#library">诗词宝库</a>
          <a href="#collections">主题诗册</a>
        </nav>
        <a
          className="favorite-link"
          href="#library"
          aria-label={`我的诗笺，已收藏${favorites.length}首`}
        >
          <BookHeart aria-hidden="true" />
          <span>我的诗笺</span>
          <b>{favorites.length}</b>
        </a>
      </header>

      <section id="discover" className="hero-shell">
        <div className="hero-copy">
          <div className="eyebrow">
            <Sparkles aria-hidden="true" /> 今天，读一首暖暖的诗
          </div>
          <h1>
            在诗里，看见
            <br />
            <em>四季与远方</em>
          </h1>
          <p>
            为孩子整理的古诗词小书房。逐句拼音、词语注释和白话译文，让每一次阅读都轻松一点。
          </p>
          <form className="hero-search" onSubmit={search}>
            <Search aria-hidden="true" />
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              aria-label="搜索诗名、诗人或诗句"
              placeholder="搜诗名、诗人，或记得的一句诗"
            />
            <Button type="submit">去找诗</Button>
          </form>
          <div className="quick-links">
            <span>大家在读</span>
            <button onClick={() => quickSearch('静夜思')}>静夜思</button>
            <button onClick={() => quickSearch('李白')}>李白</button>
            <button onClick={() => quickSearch('春')}>春天</button>
            <button onClick={() => quickSearch('水调歌头')}>水调歌头</button>
          </div>
        </div>
        <div className="hero-picture">
          <Image
            src="/poetry/hero-warm.jpg"
            width={1200}
            height={800}
            priority
            unoptimized
            alt="暖色绘本风山水中，一个孩子在桥边读诗"
          />
          <button className="today-card" onClick={() => openPoem(today)}>
            <span>今日一诗</span>
            <strong>《{today.title}》</strong>
            <small>
              {today.author} · 一起去看诗里的山河 <ChevronRight />
            </small>
          </button>
        </div>
      </section>

      <section
        id="collections"
        className="collection-strip"
        aria-label="快捷主题"
      >
        <div>
          <Compass aria-hidden="true" />
          <span>挑一本诗册</span>
        </div>
        {[
          ['widely-known', '流传最广'],
          ['primary-school', '小学精选'],
          ['classic-anthology', '经典选本'],
        ].map(([value, label]) => (
          <button
            className={filters.collection === value ? 'selected' : ''}
            key={value}
            onClick={() =>
              setFilter('collection', filters.collection === value ? '' : value)
            }
          >
            {label}
          </button>
        ))}
        {['山水', '四季', '思乡', '友情'].map((theme) => (
          <button
            className={filters.theme === theme ? 'selected' : ''}
            key={theme}
            onClick={() =>
              setFilter('theme', filters.theme === theme ? '' : theme)
            }
          >
            {theme}
          </button>
        ))}
      </section>

      <section id="library" className="content-section">
        <div className="section-heading">
          <div>
            <span>诗词宝库</span>
            <h2>
              {filters.collection
                ? collectionNames[filters.collection] || '主题诗册'
                : filters.q
                  ? `“${filters.q}”的结果`
                  : '从喜欢的一首开始'}
            </h2>
          </div>
          <p>{total ? `找到 ${total} 首` : '每首都有拼音、注释和译文'}</p>
        </div>

        <div className="filter-panel">
          <div className="filter-title">
            <SlidersHorizontal aria-hidden="true" />
            <strong>找诗条件</strong>
            {activeCount > 0 && <span>{activeCount}</span>}
            <button
              onClick={() => {
                setFilters(emptyFilters);
                setDraft('');
              }}
            >
              <RotateCcw />
              清空
            </button>
          </div>
          <div className="filters-grid">
            <Input
              value={filters.title}
              onChange={(event) => setFilter('title', event.target.value)}
              placeholder="按题目"
              aria-label="按题目筛选"
            />
            <Input
              value={filters.author}
              onChange={(event) => setFilter('author', event.target.value)}
              placeholder="按诗人姓名"
              aria-label="按诗人姓名筛选"
            />
            <FilterSelect
              label="全部朝代"
              value={filters.dynasty}
              values={facets.dynasties}
              onChange={(value) => setFilter('dynasty', value)}
            />
            <NativeSelect
              value={filters.kind}
              onChange={(event) => setFilter('kind', event.target.value)}
              aria-label="内容类型"
            >
              <NativeSelectOption value="">全部内容</NativeSelectOption>
              <NativeSelectOption value="poem">诗</NativeSelectOption>
              <NativeSelectOption value="ci">词</NativeSelectOption>
            </NativeSelect>
            <FilterSelect
              label="全部体裁"
              value={filters.form}
              values={facets.forms}
              onChange={(value) => setFilter('form', value)}
            />
            <FilterSelect
              label="全部题材"
              value={filters.theme}
              values={facets.themes}
              onChange={(value) => setFilter('theme', value)}
            />
            <FilterSelect
              label="全部词牌"
              value={filters.cipai}
              values={facets.cipais}
              onChange={(value) => setFilter('cipai', value)}
            />
          </div>
        </div>

        {error && (
          <div className="status-card error">
            <span>书页被风吹走了</span>
            <p>{error}</p>
            <Button variant="outline" onClick={() => void loadPoems(1)}>
              再试一次
            </Button>
          </div>
        )}
        {!error && loading && items.length === 0 && (
          <div className="status-card">
            <LoaderCircle className="spin" />
            <p>正在翻找合适的诗……</p>
          </div>
        )}
        {!error && !loading && items.length === 0 && (
          <div className="status-card">
            <BookOpenText />
            <span>还没有找到这首诗</span>
            <p>换一个词，或者少选一个条件试试。</p>
          </div>
        )}

        {items.length > 0 && (
          <div className="poem-grid">
            {items.map((poem, index) => (
              <article className={`poem-card ${toneFor(index)}`} key={poem.id}>
                <div className="poem-card-top">
                  <span>{poem.dynasty}</span>
                  <button
                    className={favorites.includes(poem.id) ? 'liked' : ''}
                    onClick={() => toggleFavorite(poem.id)}
                    aria-label={`${favorites.includes(poem.id) ? '取消收藏' : '收藏'}${poem.title}`}
                  >
                    <Heart aria-hidden="true" />
                  </button>
                </div>
                <small>
                  {[poem.form, ...poem.themes]
                    .filter(Boolean)
                    .slice(0, 3)
                    .join(' · ')}
                </small>
                <h3>{poem.title}</h3>
                <p>{poem.excerpt}</p>
                <footer>
                  <span>
                    {poem.author}
                    {poem.cipai && poem.cipai !== poem.title
                      ? ` · ${poem.cipai}`
                      : ''}
                  </span>
                  <button onClick={() => openPoem(poem)}>
                    读一读 <ChevronRight aria-hidden="true" />
                  </button>
                </footer>
              </article>
            ))}
          </div>
        )}
        {hasMore && (
          <div className="load-more">
            <Button
              variant="outline"
              disabled={loading}
              onClick={() => void loadPoems(page + 1, true)}
            >
              {loading ? <LoaderCircle className="spin" /> : <BookOpenText />}
              再翻一页
            </Button>
          </div>
        )}
      </section>

      <footer className="site-footer">
        <span className="brand-seal">诗</span>
        <div>
          <strong>童诗小书房</strong>
          <p>让古诗词成为孩子可以亲近的一本暖书。</p>
        </div>
        <small>古诗原文为公共领域作品；现代译注按来源保留溯源信息。</small>
      </footer>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="poem-dialog" showCloseButton>
          {detailLoading && (
            <div className="detail-loading">
              <LoaderCircle className="spin" />
              <p>正在展开诗笺……</p>
            </div>
          )}
          {!detailLoading && !detail && (
            <div className="detail-loading">
              <BookOpenText />
              <p>这页暂时没有打开，请稍后再试。</p>
            </div>
          )}
          {detail && (
            <>
              <DialogHeader className="detail-header">
                <div className="detail-tags">
                  <span>{detail.dynasty}</span>
                  <span>{detail.form}</span>
                  {detail.cipai && <span>{detail.cipai}</span>}
                </div>
                <DialogTitle>{detail.title}</DialogTitle>
                <DialogDescription>
                  {detail.dynasty} · {detail.author}　适读 {detail.ageMin}–
                  {detail.ageMax} 岁
                </DialogDescription>
                <div className="detail-actions">
                  <button
                    className={showPinyin ? 'active' : ''}
                    onClick={() => setShowPinyin(!showPinyin)}
                  >
                    <Volume2 />
                    拼音
                  </button>
                  <button
                    className={favorites.includes(detail.id) ? 'active' : ''}
                    onClick={() => toggleFavorite(detail.id)}
                  >
                    <Heart />
                    {favorites.includes(detail.id) ? '已收藏' : '收藏'}
                  </button>
                </div>
              </DialogHeader>
              <div className={`poem-paper ${showPinyin ? 'with-pinyin' : ''}`}>
                {detail.lines.map((line, index) => (
                  <PinyinLine
                    key={`${line}-${index}`}
                    line={line}
                    pinyin={detail.pinyin[index]}
                    visible={showPinyin}
                  />
                ))}
              </div>
              <Tabs defaultValue="translation" className="detail-tabs">
                <TabsList>
                  <TabsTrigger value="translation">白话译文</TabsTrigger>
                  <TabsTrigger value="notes">词语注释</TabsTrigger>
                  {detail.appreciation && (
                    <TabsTrigger value="appreciation">读诗小赏</TabsTrigger>
                  )}
                </TabsList>
                <TabsContent value="translation">
                  <ReadableText text={detail.translation} />
                </TabsContent>
                <TabsContent value="notes">
                  <ul className="note-list">
                    {detail.annotations.map((note, index) => (
                      <li key={`${index}-${note}`}>
                        <Check />
                        {note}
                      </li>
                    ))}
                  </ul>
                </TabsContent>
                {detail.appreciation && (
                  <TabsContent value="appreciation">
                    <ReadableText text={detail.appreciation} />
                  </TabsContent>
                )}
              </Tabs>
              <p className="source-note">
                数据：{detail.source.name} · 固定版本{' '}
                {detail.source.commit.slice(0, 8)}。{detail.source.licenseNote}
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function FilterSelect({
  label,
  value,
  values = [],
  onChange,
}: {
  label: string;
  value: string;
  values?: FacetValue[];
  onChange: (value: string) => void;
}) {
  return (
    <NativeSelect
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
    >
      <NativeSelectOption value="">{label}</NativeSelectOption>
      {values.map((item) => (
        <NativeSelectOption value={item.value} key={item.value}>
          {item.value}（{item.count}）
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}

function ReadableText({ text }: { text: string }) {
  return (
    <div className="readable-text">
      {text
        .split(/\n+/)
        .filter(Boolean)
        .map((paragraph, index) => (
          <p key={`${index}-${paragraph}`}>{paragraph}</p>
        ))}
    </div>
  );
}

function PinyinLine({
  line,
  pinyin,
  visible,
}: {
  line: string;
  pinyin: string;
  visible: boolean;
}) {
  const syllables = pinyin
    .replace(/[，。！？；、,.!?;：“”‘’（）()]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  let syllableIndex = 0;
  return (
    <span className="poem-line">
      {Array.from(line).map((character, index) => {
        const isHan = /\p{Script=Han}/u.test(character);
        const syllable = isHan ? syllables[syllableIndex++] || '' : '';
        return (
          <ruby key={`${character}-${index}`}>
            <span>{character}</span>
            {visible && syllable && <rt>{syllable}</rt>}
          </ruby>
        );
      })}
    </span>
  );
}
