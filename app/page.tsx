'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import {
  clearReaderContext,
  readHomeState,
  saveHomeState,
  saveReaderContext,
} from '@/lib/poetry-navigation';
import { chooseFreshPoem } from '@/lib/poetry-random';

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

const filterKeys = Object.keys(emptyFilters) as (keyof SearchFilters)[];

const collectionNames: Record<string, string> = {
  'widely-known': '流传最广',
  'primary-school': '小学精选',
  'middle-school': '初中诗词',
  'high-school': '高中诗词',
  'classic-anthology': '经典选本',
  'first-poems': '初识古诗',
};

type Recommendation = {
  label: string;
  kind: 'author' | 'cipai' | 'title' | 'theme' | 'content';
  value: string;
};

const heroVariants = [
  {
    eyebrow: '晨光铺上石桥，诗意刚刚醒来',
    lead: '在一行诗里，',
    emphasis: '遇见山河',
    description: '循着清亮的诗句，去看远山、流水与少年心中的辽阔。',
    image: '/poetry/hero/hero-ink-01.webp',
    alt: '晨光里的石桥与远山',
  },
  {
    eyebrow: '细雨入竹林，声声都是清韵',
    lead: '听竹叶落雨，',
    emphasis: '读一纸清欢',
    description: '让字音轻轻落下，在雨声和竹影间读懂古人的心事。',
    image: '/poetry/hero/hero-ink-02.webp',
    alt: '烟雨竹林中的小径',
  },
  {
    eyebrow: '一湖月色，照见千年前的夜',
    lead: '月光落进书页，',
    emphasis: '诗意悄然生长',
    description: '从一轮明月出发，听诗人把思念写进清风与水波。',
    image: '/poetry/hero/hero-ink-03.webp',
    alt: '月下湖面与一叶小舟',
  },
  {
    eyebrow: '桃花逐水，春天写下一封信',
    lead: '桃花顺水去，',
    emphasis: '少年向春行',
    description: '读花影、春风和溪水，也读每一句蓬勃明亮的心情。',
    image: '/poetry/hero/hero-ink-04.webp',
    alt: '桃花盛开的春日山谷',
  },
  {
    eyebrow: '雪落无声，梅香正好翻书',
    lead: '雪落梅枝上，',
    emphasis: '诗从暖窗来',
    description: '在安静的冬日里，读一枝梅，也读坚韧和温柔。',
    image: '/poetry/hero/hero-ink-05.webp',
    alt: '雪村与盛开的红梅',
  },
  {
    eyebrow: '明月出关山，长风吹过少年衣',
    lead: '长风越关山，',
    emphasis: '少年有远志',
    description: '走近边塞的月与风，读见勇气、家国和辽阔天地。',
    image: '/poetry/hero/hero-ink-06.webp',
    alt: '月光下的边塞关山',
  },
  {
    eyebrow: '云开瀑落，天地自有清音',
    lead: '飞瀑入云间，',
    emphasis: '一句见天地',
    description: '让山水走进眼前，在古人的笔下听见万物回响。',
    image: '/poetry/hero/hero-ink-07.webp',
    alt: '群山飞瀑与白鹤',
  },
  {
    eyebrow: '荷风翻页，盛夏也有清凉',
    lead: '荷风翻书页，',
    emphasis: '夏日有清香',
    description: '从一池青荷读起，把蝉声、月色和清香收进诗里。',
    image: '/poetry/hero/hero-ink-08.webp',
    alt: '夏日荷塘与远山',
  },
  {
    eyebrow: '秋色漫山，古寺藏在云深处',
    lead: '枫叶染秋山，',
    emphasis: '古意正温柔',
    description: '沿着一条山路，读秋风、归雁与沉静悠长的时光。',
    image: '/poetry/hero/hero-ink-09.webp',
    alt: '红枫山路与云中古寺',
  },
  {
    eyebrow: '燕子归来，把春光衔进屋檐',
    lead: '春风过田野，',
    emphasis: '燕子衔诗来',
    description: '看麦苗新绿、纸鸢高飞，在诗里遇见鲜活的人间。',
    image: '/poetry/hero/hero-ink-10.webp',
    alt: '春日田野、燕子与纸鸢',
  },
  {
    eyebrow: '海天相接，心也随着白云舒展',
    lead: '云海连天阔，',
    emphasis: '心随诗更远',
    description: '从浪花读到天边，让想象越过山海，抵达更远的地方。',
    image: '/poetry/hero/hero-ink-11.webp',
    alt: '海崖、云海与远帆',
  },
  {
    eyebrow: '月上小桥，灯影温柔了江南',
    lead: '灯火映小桥，',
    emphasis: '今夜读江南',
    description: '在桨声与灯火里慢慢读，听见水乡静谧的夜。',
    image: '/poetry/hero/hero-ink-12.webp',
    alt: '月夜江南水乡与石桥灯影',
  },
] as const;

const recommendedTitles = [
  '静夜思',
  '春晓',
  '登鹳雀楼',
  '望庐山瀑布',
  '江雪',
  '咏鹅',
  '悯农',
  '游子吟',
  '山行',
  '清明',
  '江南春',
  '早发白帝城',
  '赠汪伦',
  '黄鹤楼',
  '枫桥夜泊',
  '相思',
  '竹里馆',
  '鹿柴',
  '泊船瓜洲',
  '题西林壁',
  '饮湖上初晴后雨',
  '示儿',
  '元日',
  '村居',
  '墨梅',
  '石灰吟',
  '水调歌头',
  '念奴娇',
  '如梦令',
  '声声慢',
  '满江红',
  '破阵子',
  '天净沙',
  '观沧海',
  '木兰诗',
  '短歌行',
  '蜀道难',
  '琵琶行',
  '将进酒',
  '锦瑟',
  '虞美人',
  '青玉案',
];

function buildRecommendationPool(facets: Facets): Recommendation[] {
  const candidates: Recommendation[] = [
    ...(facets.authors || []).slice(0, 72).map((item) => ({
      label: item.value,
      kind: 'author' as const,
      value: item.value,
    })),
    ...(facets.cipais || []).slice(0, 60).map((item) => ({
      label: item.value,
      kind: 'cipai' as const,
      value: item.value,
    })),
    ...recommendedTitles.map((value) => ({
      label: value,
      kind: 'title' as const,
      value,
    })),
    ...(facets.themes || []).slice(0, 30).map((item) => ({
      label: item.value,
      kind: 'theme' as const,
      value: item.value,
    })),
    { label: '唐诗', kind: 'content' as const, value: 'poem' },
    { label: '宋词', kind: 'content' as const, value: 'ci' },
    { label: '元曲', kind: 'content' as const, value: 'qu' },
  ];
  return candidates.filter(
    (item, index) =>
      item.label &&
      candidates.findIndex(
        (candidate) =>
          candidate.kind === item.kind && candidate.value === item.value,
      ) === index,
  );
}

function pickRecommendations(pool: Recommendation[], count = 4) {
  const shuffled = [...pool];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled.slice(0, count);
}

function nextHeroIndex(previous: number) {
  if (heroVariants.length < 2) return 0;
  let next = Math.floor(Math.random() * heroVariants.length);
  if (next === previous) next = (next + 1) % heroVariants.length;
  return next;
}

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

function readFilters(params: URLSearchParams): SearchFilters {
  return filterKeys.reduce(
    (result, key) => ({ ...result, [key]: params.get(key) || '' }),
    emptyFilters,
  );
}

function makeHomeHref(filters: SearchFilters, keepLibrary = false) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(
    ([key, value]) => value && params.set(key, value),
  );
  const query = params.toString();
  const library = keepLibrary || query ? '#library' : '';
  return `/poetry/${query ? `?${query}` : ''}${library}`;
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
  const [heroIndex, setHeroIndex] = useState(0);
  const [recommendations, setRecommendations] = useState<Recommendation[]>(
    recommendedTitles.slice(0, 4).map((value) => ({
      label: value,
      kind: 'title',
      value,
    })),
  );
  const [favorites, setFavorites] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const requestSequence = useRef(0);
  const loadingRequest = useRef(false);
  const loadMoreSentinel = useRef<HTMLDivElement | null>(null);
  const skipInitialLoad = useRef(false);
  const restoreScrollY = useRef<number | null>(null);

  useEffect(() => {
    const locationFilters = readFilters(
      new URLSearchParams(window.location.search),
    );
    const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash || (window.location.search ? '#library' : '')}`;
    const saved = readHomeState();
    if (
      saved &&
      saved.returnHref === currentHref &&
      Date.now() - saved.savedAt < 12 * 60 * 60 * 1000
    ) {
      setFilters(saved.filters as SearchFilters);
      setDraft(saved.draft);
      setTitleDraft(saved.titleDraft);
      setAuthorDraft(saved.authorDraft);
      setItems(saved.items);
      setTotal(saved.total);
      setPage(saved.page);
      setHasMore(saved.hasMore);
      skipInitialLoad.current = true;
      restoreScrollY.current = saved.scrollY;
    } else {
      setFilters(locationFilters);
      setDraft(locationFilters.q);
      setTitleDraft(locationFilters.title);
      setAuthorDraft(locationFilters.author);
    }
    window.history.scrollRestoration = 'manual';
    setHydrated(true);
  }, []);

  useEffect(() => {
    const refreshDiscoveries = () => {
      setHeroIndex((current) => nextHeroIndex(current));
      setRecommendations((current) => {
        const pool = buildRecommendationPool(facets);
        return pool.length >= 4 ? pickRecommendations(pool) : current;
      });
    };
    refreshDiscoveries();
    window.addEventListener('pageshow', refreshDiscoveries);
    return () => window.removeEventListener('pageshow', refreshDiscoveries);
  }, [facets]);

  useEffect(() => {
    if (!hydrated) return;
    const keepLibrary = window.location.hash === '#library';
    window.history.replaceState(
      window.history.state,
      '',
      makeHomeHref(filters, keepLibrary),
    );
  }, [filters, hydrated]);

  useEffect(() => {
    if (!hydrated || restoreScrollY.current === null || items.length === 0)
      return;
    const y = restoreScrollY.current;
    restoreScrollY.current = null;
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => window.scrollTo({ top: y })),
    );
  }, [hydrated, items.length]);

  useEffect(() => {
    setFavorites(readFavorites());
    const controller = new AbortController();
    void getJSON<Facets>('/facets', controller.signal)
      .then((data) => {
        setFacets(data);
        const pool = buildRecommendationPool(data);
        if (pool.length >= 4) setRecommendations(pickRecommendations(pool));
      })
      .catch(() => undefined);
    void getJSON<{ items: PoemListItem[] }>(
      '/featured?collection=widely-known&limit=12&random=true',
      controller.signal,
    )
      .then((data) => {
        const poem = chooseFreshPoem(data.items);
        if (poem) setFeatured([poem]);
      })
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
    if (!hydrated) return;
    const controller = new AbortController();
    if (skipInitialLoad.current) {
      skipInitialLoad.current = false;
      return () => controller.abort();
    }
    void loadPoems(1, false, controller.signal);
    return () => controller.abort();
  }, [hydrated, loadPoems]);

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

  const applyRecommendation = (recommendation: Recommendation) => {
    setDraft('');
    setTitleDraft('');
    setAuthorDraft('');
    const next = { ...emptyFilters };
    if (recommendation.kind === 'title') {
      next.title = recommendation.value;
      setTitleDraft(recommendation.value);
    } else if (recommendation.kind === 'author') {
      next.author = recommendation.value;
      setAuthorDraft(recommendation.value);
    } else if (recommendation.kind === 'cipai') {
      next.cipai = recommendation.value;
    } else if (recommendation.kind === 'theme') {
      next.theme = recommendation.value;
    } else {
      next.kind = recommendation.value;
    }
    setFilters(next);
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
        '/featured?collection=widely-known&limit=12&random=true',
      );
      const poem = chooseFreshPoem(data.items);
      if (!poem) throw new Error('没有可读作品');
      await getJSON(`/poems/${encodeURIComponent(poem.id)}`);
      const returnHref = makeHomeHref(filters, true);
      window.history.replaceState(window.history.state, '', returnHref);
      saveReaderContext({ mode: 'random', currentId: poem.id, returnHref });
      router.push(`/poems/${poem.id}`);
    } catch {
      setRandomError('这次风没有翻开书页，再点一次试试。');
    } finally {
      setRandomLoading(false);
    }
  };

  const rememberListVisit = (poemID: string) => {
    const returnHref = makeHomeHref(filters, true);
    window.history.replaceState(window.history.state, '', returnHref);
    saveHomeState({
      filters,
      draft,
      titleDraft,
      authorDraft,
      items,
      total,
      page,
      hasMore,
      scrollY: window.scrollY,
      returnHref,
      savedAt: Date.now(),
    });
    saveReaderContext({
      mode: 'list',
      poemIds: items.map((item) => item.id),
      currentId: poemID,
      returnHref,
    });
  };

  const today = featured[0];
  const hero = heroVariants[heroIndex];

  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="诗里山河首页">
          <Image
            className="brand-logo"
            src="/poetry/logo.svg"
            width={42}
            height={42}
            alt=""
          />
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
            <Sparkles aria-hidden="true" /> {hero.eyebrow}
          </div>
          <h1>
            {hero.lead}
            <br />
            <em>{hero.emphasis}</em>
          </h1>
          <p>
            {hero.description} 共收录 {formatCount(catalogCount)} 首诗、词、曲。
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
            <span>大家都在读</span>
            {recommendations.map((recommendation) => (
              <button
                key={`${recommendation.kind}-${recommendation.value}`}
                onClick={() => applyRecommendation(recommendation)}
              >
                {recommendation.label}
              </button>
            ))}
          </div>
        </div>
        <div className="hero-picture">
          <Image
            key={hero.image}
            src={hero.image}
            width={1200}
            height={800}
            priority
            unoptimized
            alt={hero.alt}
          />
          {today ? (
            <Link
              className="today-card"
              href={`/poems/${today.id}`}
              onClick={clearReaderContext}
            >
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
          ['middle-school', '初中诗词'],
          ['high-school', '高中诗词'],
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
            <span aria-label="当前条件命中数">
              {loading && page === 1 ? '…' : formatCount(total)}
            </span>
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
                      <Link
                        className="row-main"
                        href={`/poems/${poem.id}`}
                        onClick={() => rememberListVisit(poem.id)}
                      >
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
        <Image
          className="brand-logo"
          src="/poetry/logo.svg"
          width={42}
          height={42}
          alt=""
        />
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
