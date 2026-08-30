import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '诗里山河｜儿童古诗词阅读',
  description: '带拼音、注释和白话译文的儿童古诗词网站。',
  openGraph: {
    title: '诗里山河｜在诗里看见四季与远方',
    description: '为孩子整理的古诗词小书房，逐句拼音、词语注释和白话译文。',
    images: [
      {
        url: '/poetry/og.png',
        width: 1200,
        height: 630,
        alt: '诗里山河暖色山水绘本分享图',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
