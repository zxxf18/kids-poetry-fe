'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookHeart,
  BookOpenText,
  ChevronRight,
  Compass,
  Heart,
  LoaderCircle,
  RotateCcw,
  Search,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import {
  formatCount,
  type Facets,
  type FacetValue,
  getJSON,
  type PoemListItem,
  readFavorites,
  updateFavorite,
} from '@/lib/poetry';

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

function makeParams(filters: SearchFilters, page = 1) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: '24',
  });
  Object.entries(filters).forEach(
    ([key, value]) => value && params.set(key, value),
  );
  return params;
}

export default function Home() {
  const router = useRouter();
  const [draft, setDraft] = useState('');
  const [titleDraft, setTitleDraft] = useState('');
  const [authorDraft, setAuthorDraft] = useState('');
  const [filters, setFilters] = useState<SearchFilters>(emptyFilters);
  const [facets, setFacets] = useState<Facets>({});
  const [featured, setFeatured] = useState<PoemListItem[]>([]);
  const [items, setItems] = useState<PoemListItem[]>([]);
  const [catalogCount, setCatalogCount] = useState(531001);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [randomLoading, setRandomLoading] = useState(false);
  const [randomError, setRandomError] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const requestSequence = useRef(0);
  const loadingRequest = useRef(false);
  const loadMoreSentinel = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setFavorites(readFavorites());
    const controller = new AbortController();
    void getJSON<Facets>('/facets', controller.signal)
      .then(setFacets)
      .catch(() => undefined);
    void getJSON<{ items: PoemListItem[] }>(
      '/featured?collection=widely-known&limit=1&random=true',
      controller.signal,
    )
      .then((data) => setFeatured(data.items))
      .catch(() => undefined);
    void getJSON<{ count: number }>('/meta', controller.signal)
      .then((meta) => setCatalogCount(meta.count))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => ({
        ...current,
        title: titleDraft.trim(),
        author: authorDraft.trim(),
      }));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [titleDraft, authorDraft]);

  const loadPoems = useCallback(
    async (nextPage: number, append = false, signal?: AbortSignal) => {
      const sequence = ++requestSequence.current;
      loadingRequest.current = true;
      setLoading(true);
      setError('');
      if (!append) {
        setItems([]);
        setTotal(0);
        setPage(1);
        setHasMore(false);
      }
      try {
        const data = await getJSON<{
          items: PoemListItem[];
          total: number;
          hasMore: boolean;
        }>(`/poems?${makeParams(filters, nextPage)}`, signal);
        if (sequence !== requestSequence.current) return;
        setItems((current) =>
          append ? [...current, ...data.items] : data.items,
        );
        setTotal(data.total);
        setHasMore(data.hasMore);
        setPage(nextPage);
      } catch (reason) {
        if (
          sequence === requestSequence.current &&
          (reason as Error).name !== 'AbortError'
        ) {
          setError('诗词书库暂时没有打开，请稍后再试。');
          if (!append) setItems([]);
        }
      } finally {
        if (sequence === requestSequence.current) {
          loadingRequest.current = false;
          setLoading(false);
        }
      }
    },
    [filters],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadPoems(1, false, controller.signal);
    return () => controller.abort();
  }, [loadPoems]);

  useEffect(() => {
    const target = loadMoreSentinel.current;
    if (!target || !hasMore || loading || loadingRequest.current || error)
      return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || loadingRequest.current) return;
        observer.disconnect();
        void loadPoems(page + 1, true);
      },
      { rootMargin: '480px 0px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [error, hasMore, loadPoems, loading, page]);

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
    setTitleDraft('');
    setAuthorDraft('');
    setFilters({ ...emptyFilters, q });
    document
      .getElementById('library')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    setDraft('');
    setTitleDraft('');
    setAuthorDraft('');
  };

  const readAtRandom = async () => {
    if (randomLoading) return;
    setRandomLoading(true);
    setRandomError('');
    try {
      const data = await getJSON<{ items: PoemListItem[] }>(
        '/featured?collection=widely-known&limit=1&random=true',
      );
      const poem = data.items[0];
      if (!poem) throw new Error('没有可读作品');
      await getJSON(`/poems/${encodeURIComponent(poem.id)}`);
      router.push(`/poems/${poem.id}`);
    } catch {
      setRandomError('这次风没有翻开书页，再点一次试试。');
    } finally {
      setRandomLoading(false);
    }
  };

  const activeCount = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters],
  );
  const today = featured[0];

  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="诗里山河首页">
          <span className="brand-seal">诗</span>
          <span>诗里山河</span>
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
            收录 {formatCount(catalogCount)}{' '}
            首诗、词、曲。正文逐句配拼音，名篇另有词语注释和白话译文。
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
          {today ? (
            <Link className="today-card" href={`/poems/${today.id}`}>
              <span>今日一诗</span>
              <strong>《{today.title}》</strong>
              <small>
                {today.author} · 一起去看诗里的山河 <ChevronRight />
              </small>
            </Link>
          ) : (
            <div className="today-card today-loading" aria-busy="true">
              <span>今日一诗</span>
              <strong>正从名篇里抽一首……</strong>
            </div>
          )}
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
          ['first-poems', '初识古诗'],
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
        {[
          '山水',
          '四季',
          '思乡',
          '友情',
          '月夜',
          '田园',
          '咏物',
          '边塞',
          '家国',
          '人生感怀',
        ].map((theme) => (
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
            <span>万卷诗林</span>
            <h2>
              {filters.collection
                ? collectionNames[filters.collection] || '主题诗册'
                : filters.q
                  ? `“${filters.q}”的结果`
                  : '循着一行诗，遇见一方天地'}
            </h2>
          </div>
          <p aria-live="polite">
            {loading && page === 1
              ? '正在寻诗……'
              : `共收录 ${formatCount(total)} 首`}
          </p>
        </div>

        <div className="filter-panel">
          <div className="filter-title">
            <SlidersHorizontal aria-hidden="true" />
            <strong>循迹找诗</strong>
            {activeCount > 0 && <span>{activeCount}</span>}
            <button onClick={clearFilters}>
              <RotateCcw /> 重置
            </button>
          </div>
          <div className="filters-grid">
            <Input
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              placeholder="按题目"
              aria-label="按题目筛选"
            />
            <Input
              value={authorDraft}
              onChange={(event) => setAuthorDraft(event.target.value)}
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
              <NativeSelectOption value="qu">曲</NativeSelectOption>
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
              label="全部词牌 / 曲牌"
              value={filters.cipai}
              values={facets.cipais}
              onChange={(value) => setFilter('cipai', value)}
            />
            <button
              className="learning-filter wander-button"
              onClick={() => void readAtRandom()}
              disabled={randomLoading}
            >
              {randomLoading ? <LoaderCircle className="spin" /> : <Shuffle />}
              {randomLoading ? '正在翻诗' : '随心读一首'}
            </button>
          </div>
        </div>

        <div className="catalog-shell">
          <div className="catalog-note">
            <BookOpenText />
            <span aria-live="polite">
              {randomError ||
                '风从书页来。点开一首，慢慢读它的声，也读它的远方。'}
            </span>
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
            <div className="poem-list">
              {items.map((poem, index) => {
                const liked = favorites.includes(poem.id);
                return (
                  <article className="poem-row" key={poem.id}>
                    <div className="catalog-index" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div className="row-content">
                      <Link className="row-main" href={`/poems/${poem.id}`}>
                        <div className="row-meta">
                          <span className="dynasty-mark">{poem.dynasty}</span>
                          <span>{poem.author}</span>
                          <span>{poem.form}</span>
                          {poem.cipai && poem.cipai !== poem.title && (
                            <span>{poem.cipai}</span>
                          )}
                        </div>
                        <h3>{displayListTitle(poem)}</h3>
                        <p>{poem.excerpt}</p>
                      </Link>
                      <div className="row-foot">
                        <div className="data-badges">
                          {poem.hasPinyin && <span>拼音</span>}
                          {poem.hasTranslation && <span>译文</span>}
                          {poem.hasAnnotations && <span>注释</span>}
                          {!poem.hasTranslation && !poem.hasAnnotations && (
                            <span className="plain">原文</span>
                          )}
                        </div>
                        <button
                          className={`row-favorite ${liked ? 'liked' : ''}`}
                          onClick={() =>
                            setFavorites((current) =>
                              updateFavorite(current, poem.id),
                            )
                          }
                          aria-label={`${liked ? '取消收藏' : '收藏'}${poem.title}`}
                        >
                          <Heart aria-hidden="true" /> {liked ? '已收' : '收藏'}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="load-more" ref={loadMoreSentinel} aria-live="polite">
            {items.length > 0 && hasMore && (
              <span>
                {loading ? <LoaderCircle className="spin" /> : <BookOpenText />}
                {loading ? '正在续上新的诗页……' : '向下读，诗页会自己续上'}
              </span>
            )}
            {items.length > 0 && !hasMore && !loading && (
              <span>风停在这一页，已经读到尽头。</span>
            )}
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <span className="brand-seal">诗</span>
        <div>
          <strong>诗里山河</strong>
          <p>让古诗词成为孩子可以亲近的一本暖书。</p>
        </div>
        <small>一字一音慢慢读，一诗一页看山河。</small>
      </footer>
    </main>
  );
}

function displayListTitle(poem: PoemListItem): string {
  if ((poem.titleCount || 1) <= 1) return poem.title;
  const firstPhrase = poem.excerpt
    .trim()
    .split(/[，。！？；]/u, 1)[0]
    ?.trim();
  if (!firstPhrase || poem.title.includes(firstPhrase)) return poem.title;
  return `${poem.title} · ${firstPhrase}`;
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
          {item.value}（{formatCount(item.count)}）
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}
