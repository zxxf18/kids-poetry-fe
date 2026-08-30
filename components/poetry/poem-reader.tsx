'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BookOpenText,
  Check,
  Heart,
  Languages,
  LoaderCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PinyinLine } from '@/components/poetry/pinyin-line';
import {
  getJSON,
  type PoemDetail,
  readFavorites,
  updateFavorite,
} from '@/lib/poetry';

export function PoemReader({ id }: { id: string }) {
  const [detail, setDetail] = useState<PoemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPinyin, setShowPinyin] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [retry, setRetry] = useState(0);

  useEffect(() => setFavorites(readFavorites()), []);
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

  if (loading) {
    return (
      <main className="reader-page">
        <ReaderTop />
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
        <ReaderTop />
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

  return (
    <main className="reader-page">
      <ReaderTop />
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
            {detail.dynasty} · {detail.author}　适读 {detail.ageMin}–
            {detail.ageMax} 岁
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
          </div>
        </header>

        <div className="reader-spread">
          <section
            className={`reader-poem-page ${showPinyin ? 'with-pinyin' : ''}`}
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
            <p className="reading-hint">
              {showPinyin
                ? '拼音按字对照；分段标题保留原样。'
                : '轻点上方“显示拼音”，可以逐字跟读。'}
            </p>
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

function ReaderTop() {
  return (
    <header className="reader-topbar">
      <Link className="reader-back" href="/#library">
        <ArrowLeft /> 返回诗词宝库
      </Link>
      <Link className="brand" href="/" aria-label="诗里小山河首页">
        <span className="brand-seal">诗</span>
        <span>诗里小山河</span>
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
