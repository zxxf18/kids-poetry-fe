'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
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
  }, [id]);

  const firstSection = useMemo(() => {
    if (detail?.translation) return 'translation';
    if (detail?.annotations.length) return 'notes';
    if (detail?.appreciation) return 'appreciation';
    return 'source';
  }, [detail]);

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
          <Button asChild variant="outline">
            <Link href="/#library">回到诗词宝库</Link>
          </Button>
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
              {detail.lines.map((line, index) => (
                <PinyinLine
                  key={`${index}-${line}`}
                  line={line}
                  pinyin={detail.pinyin[index]}
                  visible={showPinyin}
                />
              ))}
            </div>
            <p className="reading-hint">
              {showPinyin
                ? '拼音按字对照；分段标题保留原样。'
                : '轻点上方“显示拼音”，可以逐字跟读。'}
            </p>
          </section>

          <section className="reader-learning-page">
            <div className="page-label">读懂这首诗</div>
            <Tabs defaultValue={firstSection} className="reader-tabs">
              <TabsList>
                {detail.translation && (
                  <TabsTrigger value="translation">白话译文</TabsTrigger>
                )}
                {detail.annotations.length > 0 && (
                  <TabsTrigger value="notes">词语注释</TabsTrigger>
                )}
                {detail.appreciation && (
                  <TabsTrigger value="appreciation">读诗小赏</TabsTrigger>
                )}
                <TabsTrigger value="source">来源说明</TabsTrigger>
              </TabsList>
              {detail.translation && (
                <TabsContent value="translation">
                  <ReadableText text={detail.translation} />
                </TabsContent>
              )}
              {detail.annotations.length > 0 && (
                <TabsContent value="notes">
                  <ul className="note-list">
                    {detail.annotations.map((note, index) => (
                      <li key={`${index}-${note}`}>
                        <Check />
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </TabsContent>
              )}
              {detail.appreciation && (
                <TabsContent value="appreciation">
                  <ReadableText text={detail.appreciation} />
                </TabsContent>
              )}
              <TabsContent value="source">
                <div className="source-panel">
                  <strong>数据版本可追溯</strong>
                  <p>
                    数据来自 {detail.source.name}，固定提交{' '}
                    {detail.source.commit.slice(0, 8)}。
                  </p>
                  <p>{detail.source.licenseNote}</p>
                  <a href={detail.source.url} target="_blank" rel="noreferrer">
                    查看数据源
                  </a>
                </div>
              </TabsContent>
            </Tabs>
            {!detail.translation &&
              detail.annotations.length === 0 &&
              !detail.appreciation && (
                <p className="learning-empty">
                  这首作品目前只有原文与拼音，译文和注释仍待整理。
                </p>
              )}
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
      <Link className="brand" href="/" aria-label="童诗小书房首页">
        <span className="brand-seal">诗</span>
        <span>童诗小书房</span>
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
