export function PinyinLine({
  line,
  pinyin,
  visible,
}: {
  line: string;
  pinyin?: string;
  visible: boolean;
}) {
  const syllables = (pinyin || '')
    .replace(/[，。！？；、,.!?;：“”‘’（）()《》【】\[\]]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  let syllableIndex = 0;
  const characters = Array.from(line);
  const clauses: React.ReactNode[][] = [[]];

  characters.forEach((character, index) => {
    const isHan = /\p{Script=Han}/u.test(character);
    const syllable = isHan ? syllables[syllableIndex++] || '' : '';
    clauses[clauses.length - 1].push(
      <ruby key={`${character}-${index}`}>
        <span>{character}</span>
        {visible && syllable && <rt>{syllable}</rt>}
      </ruby>,
    );
    if (/[，。！？；]/.test(character) && index < characters.length - 1) {
      clauses.push([]);
    }
  });

  return (
    <span
      className={`reader-poem-line ${syllables.length ? '' : 'section-line'}`}
    >
      {clauses.map((clause, index) => (
        <span className="reader-poem-clause" key={index}>
          {clause}
        </span>
      ))}
    </span>
  );
}
