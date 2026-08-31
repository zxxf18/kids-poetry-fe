'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  ArrowLeft,
  BookOpenText,
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  Languages,
  LoaderCircle,
  Pause,
  Play,
  Shuffle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  PinyinLine,
  poemPinyinCellWidth,
} from '@/components/poetry/pinyin-line';
import {
  API,
  getJSON,
  type PoemDetail,
  readFavorites,
  updateFavorite,
} from '@/lib/poetry';
import {
  type ReaderContext,
  readReaderContext,
  saveReaderContext,
} from '@/lib/poetry-navigation';
import { chooseFreshPoem } from '@/lib/poetry-random';

export function PoemReader({ id }: { id: string }) {
  const router = useRouter();
  const [detail, setDetail] = useState<PoemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPinyin, setShowPinyin] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [retry, setRetry] = useState(0);
  const [readerContext, setReaderContext] = useState<ReaderContext | null>(
    null,
  );
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [randomLoading, setRandomLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setFavorites(readFavorites());
    const context = readReaderContext();
    if (
      context &&
      (context.currentId === id ||
        (context.mode === 'list' && context.poemIds.includes(id)))
    ) {
      const updated = { ...context, currentId: id } as ReaderContext;
      setReaderContext(updated);
      saveReaderContext(updated);
    } else {
      setReaderContext(null);
    }
  }, [id]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getJSON<PoemDetail>(`/poems/${encodeURIComponent(id)}`, controller.signal)
      .then((payload) =>
        setDetail({
          ...payload,
          lines: payload.lines || [],
          pinyin: payload.pinyin || [],
          annotations: payload.annotations || [],
          themes: payload.themes || [],
          collections: payload.collections || [],
        }),
      )
      .catch((reason: Error) => {
        if (reason.name !== 'AbortError') setError('这页诗笺暂时没有打开。');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [id, retry]);

  useEffect(() => {
    setAudioPlaying(false);
    setAudioError('');
  }, [id]);

  if (loading) {
    return (
      <main className="reader-page">
        <ReaderTop returnHref={readerContext?.returnHref} />
        <div className="reader-status">
          <LoaderCircle className="spin" />
          <p>正在展开诗笺……</p>
        </div>
      </main>
    );
  }

  if (error || !detail) {
    return (
      <main className="reader-page">
        <ReaderTop returnHref={readerContext?.returnHref} />
        <div className="reader-status">
          <BookOpenText />
          <h1>{error || '没有找到这首诗'}</h1>
          <p>可以重新展开一次，或回到诗林换一首。</p>
          <div className="reader-status-actions">
            <Button variant="outline" onClick={() => setRetry((n) => n + 1)}>
              再试一次
            </Button>
            <Link className="reader-status-link" href="/#library">
              回到诗词宝库
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const liked = favorites.includes(detail.id);
  const listIndex =
    readerContext?.mode === 'list'
      ? readerContext.poemIds.indexOf(detail.id)
      : -1;
  const previousID =
    readerContext?.mode === 'list' && listIndex > 0
      ? readerContext.poemIds[listIndex - 1]
      : '';
  const nextID =
    readerContext?.mode === 'list' &&
    listIndex >= 0 &&
    listIndex < readerContext.poemIds.length - 1
      ? readerContext.poemIds[listIndex + 1]
      : '';
  const poemPageStyle = {
    '--pinyin-cell-width': poemPinyinCellWidth(detail.pinyin),
  } as CSSProperties;

  const navigateWithinList = (nextID: string) => {
    if (!nextID || readerContext?.mode !== 'list') return;
    const updated: ReaderContext = {
      ...readerContext,
      currentId: nextID,
    };
    saveReaderContext(updated);
    setReaderContext(updated);
    router.push(`/poems/${nextID}`);
  };

  const toggleAudio = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    setAudioError('');
    try {
      if (audio.paused) await audio.play();
      else audio.pause();
    } catch {
      setAudioError('朗读暂时没有播放成功，请稍后再试。');
    }
  };

  const readAnotherRandom = async () => {
    if (randomLoading || readerContext?.mode !== 'random') return;
    setRandomLoading(true);
    try {
      const data = await getJSON<{ items: { id: string }[] }>(
        '/featured?collection=widely-known&limit=12&random=true',
      );
      const nextID = chooseFreshPoem(
        data.items.filter((item) => item.id !== detail.id),
      )?.id;
      if (!nextID) throw new Error('no different poem');
      const updated: ReaderContext = {
        ...readerContext,
        currentId: nextID,
      };
      saveReaderContext(updated);
      setReaderContext(updated);
      router.replace(`/poems/${nextID}`);
    } catch {
      setAudioError('这次风没有翻到新的一页，再试一次吧。');
    } finally {
      setRandomLoading(false);
    }
  };

  return (
    <main className="reader-page">
      <ReaderTop returnHref={readerContext?.returnHref} />
      <article className="reader-book">
        <header className="reader-heading">
          <div className="detail-tags">
            <span>{detail.dynasty}</span>
            <span>{detail.form}</span>
            {detail.cipai && detail.cipai !== detail.title && (
              <span>{detail.cipai}</span>
            )}
            {detail.themes.slice(0, 2).map((theme) => (
              <span key={theme}>{theme}</span>
            ))}
          </div>
          <h1>{detail.title}</h1>
          <p>
            {detail.dynasty} · {detail.author}
          </p>
          <div className="reader-actions">
            <button
              className={showPinyin ? 'active' : ''}
              onClick={() => setShowPinyin((current) => !current)}
              aria-pressed={showPinyin}
            >
              <Languages /> {showPinyin ? '隐藏拼音' : '显示拼音'}
            </button>
            <button
              className={liked ? 'active' : ''}
              onClick={() =>
                setFavorites((current) => updateFavorite(current, detail.id))
              }
              aria-pressed={liked}
            >
              <Heart /> {liked ? '已收藏' : '收藏'}
            </button>
            {detail.hasAudio && (
              <button
                className={audioPlaying ? 'active' : ''}
                onClick={() => void toggleAudio()}
                aria-pressed={audioPlaying}
              >
                {audioPlaying ? <Pause /> : <Play />}
                {audioPlaying ? '暂停朗读' : '听朗读'}
              </button>
            )}
            {readerContext?.mode === 'random' && (
              <button
                onClick={() => void readAnotherRandom()}
                disabled={randomLoading}
              >
                {randomLoading ? (
                  <LoaderCircle className="spin" />
                ) : (
                  <Shuffle />
                )}
                {randomLoading ? '正在翻诗' : '再换一首'}
              </button>
            )}
          </div>
          {detail.hasAudio && (
            <audio
              ref={audioRef}
              src={`${API}/poems/${encodeURIComponent(detail.id)}/audio`}
              preload="metadata"
              onPlay={() => setAudioPlaying(true)}
              onPause={() => setAudioPlaying(false)}
              onEnded={() => setAudioPlaying(false)}
              onError={() => {
                setAudioPlaying(false);
                setAudioError('朗读暂时没有播放成功，请稍后再试。');
              }}
            />
          )}
          {audioError && <p className="reader-action-error">{audioError}</p>}
          {readerContext?.mode === 'list' && (
            <nav className="reader-sequence" aria-label="按原列表切换诗词">
              <button
                disabled={!previousID}
                onClick={() => navigateWithinList(previousID)}
              >
                <ChevronLeft /> 上一首
              </button>
              <span>
                第 {listIndex + 1} 首 · 共 {readerContext.poemIds.length} 首
              </span>
              <button
                disabled={!nextID}
                onClick={() => navigateWithinList(nextID)}
              >
                下一首 <ChevronRight />
              </button>
            </nav>
          )}
        </header>

        <div className="reader-spread">
          <section
            className={`reader-poem-page ${showPinyin ? 'with-pinyin' : ''}`}
            style={poemPageStyle}
          >
            <div className="page-label">原文</div>
            <div className="reader-poem-body">
              {detail.lines.length > 0 ? (
                detail.lines.map((line, index) => (
                  <PinyinLine
                    key={`${index}-${line}`}
                    line={line}
                    pinyin={detail.pinyin[index]}
                    visible={showPinyin}
                  />
                ))
              ) : (
                <EmptyLearning text="这首作品的正文还在整理，请稍后再来。" />
              )}
            </div>
          </section>

          <section className="reader-learning-page">
            <div className="page-label">读懂这首诗</div>
            <Tabs defaultValue="translation" className="reader-tabs">
              <TabsList>
                <TabsTrigger value="translation">白话译文</TabsTrigger>
                <TabsTrigger value="notes">词语注释</TabsTrigger>
                <TabsTrigger value="appreciation">读诗小赏</TabsTrigger>
              </TabsList>
              <TabsContent value="translation">
                {detail.translation ? (
                  <ReadableText text={detail.translation} />
                ) : (
                  <EmptyLearning text="这首作品的白话译文还在整理，先听听原文的声音吧。" />
                )}
              </TabsContent>
              <TabsContent value="notes">
                {detail.annotations.length > 0 ? (
                  <ul className="note-list">
                    {detail.annotations.map((note, index) => (
                      <li key={`${index}-${note}`}>
                        <Check />
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyLearning text="这首作品暂时没有词语注释，遇到生字可以先看拼音。" />
                )}
              </TabsContent>
              <TabsContent value="appreciation">
                {detail.appreciation ? (
                  <ReadableText text={detail.appreciation} />
                ) : (
                  <EmptyLearning text="这首作品的赏读还没有写好，先说说你读见了怎样的画面。" />
                )}
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </article>
    </main>
  );
}

function ReaderTop({ returnHref }: { returnHref?: string }) {
  const clientReturnHref = returnHref
    ? returnHref.replace(/^\/poetry(?=\/|$)/, '') || '/'
    : '/#library';
  return (
    <header className="reader-topbar">
      <Link className="reader-back" href={clientReturnHref}>
        <ArrowLeft /> 返回诗词宝库
      </Link>
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
      <span className="reader-top-note">一页一诗，慢慢读</span>
    </header>
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

function EmptyLearning({ text }: { text: string }) {
  return (
    <div className="learning-empty">
      <BookOpenText aria-hidden="true" />
      <p>{text}</p>
    </div>
  );
}
