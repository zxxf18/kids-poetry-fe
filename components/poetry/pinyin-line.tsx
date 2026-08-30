import type { CSSProperties } from 'react';

export function PinyinLine({
  line,
  pinyin,
  visible,
}: {
  line: string;
  pinyin?: string;
  visible: boolean;
}) {
  const sectionLine = /^[【\[]/.test(line.trim());
  const resolvedPinyin = pinyin?.trim() || sectionPinyin(line);
  const syllables = resolvedPinyin
    .replace(/[，。！？；、,.!?;：“”‘’（）()《》【】\[\]]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  let syllableIndex = 0;
  const characters = Array.from(line);
  const clauses: React.ReactNode[][] = [[]];
  const longestSyllable = syllables.reduce(
    (longest, syllable) => Math.max(longest, Array.from(syllable).length),
    0,
  );
  const cellWidth = Math.max(
    1.45,
    Math.min(2.35, longestSyllable * 0.31 + 0.15),
  );
  const lineStyle = (
    visible && longestSyllable
      ? { '--pinyin-cell-width': `${cellWidth.toFixed(2)}em` }
      : undefined
  ) as CSSProperties | undefined;

  characters.forEach((character, index) => {
    const isHan = /\p{Script=Han}/u.test(character);
    const syllable = isHan ? syllables[syllableIndex++] || '' : '';
    clauses[clauses.length - 1].push(
      <span
        className={`reading-cell ${isHan ? 'pinyin-cell' : 'punctuation-cell'}`}
        key={`${character}-${index}`}
        aria-label={
          visible && syllable ? `${character}，${syllable}` : character
        }
      >
        {visible && longestSyllable > 0 && (
          <span className="pinyin-reading" aria-hidden="true">
            {syllable || '\u00a0'}
          </span>
        )}
        <span className="pinyin-character" aria-hidden="true">
          {character}
        </span>
      </span>,
    );
    if (/[，。！？；]/.test(character) && index < characters.length - 1) {
      clauses.push([]);
    }
  });

  return (
    <span
      className={`reader-poem-line ${sectionLine ? 'section-line' : ''} ${syllables.length ? '' : 'without-pinyin'} ${visible && longestSyllable ? 'with-pinyin' : ''}`}
      style={lineStyle}
    >
      {clauses.map((clause, index) => (
        <span className="reader-poem-clause" key={index}>
          {clause}
        </span>
      ))}
      {visible && syllables.length === 0 && /\p{Script=Han}/u.test(line) && (
        <small className="pinyin-pending">本行拼音整理中</small>
      )}
    </span>
  );
}

const sectionSounds: Record<string, string> = {
  第: 'dì',
  其: 'qí',
  上: 'shàng',
  下: 'xià',
  零: 'líng',
  一: 'yī',
  二: 'èr',
  三: 'sān',
  四: 'sì',
  五: 'wǔ',
  六: 'liù',
  七: 'qī',
  八: 'bā',
  九: 'jiǔ',
  十: 'shí',
  百: 'bǎi',
  首: 'shǒu',
};

function sectionPinyin(line: string): string {
  if (!/^[【\[]/.test(line.trim())) return '';
  return Array.from(line)
    .filter((character) => /\p{Script=Han}/u.test(character))
    .map((character) => sectionSounds[character] || '')
    .filter(Boolean)
    .join(' ');
}
