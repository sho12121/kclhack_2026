import dictionary from "../../ng_words_movie_board.json" with { type: "json" };

type Range = { start: number; end: number };
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalize = (value: string) => value.normalize("NFKC").toLowerCase();
const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });
function wordsRegex(words: string[], wholeWord = false) {
  const terms = [...new Set(words.map(normalize).filter(Boolean))].sort((a,b) => b.length-a.length).map(escape);
  return terms.length ? new RegExp(`${wholeWord ? "(?<![a-z0-9_])" : ""}(?:${terms.join("|")})${wholeWord ? "(?![a-z0-9_])" : ""}`, "gu") : null;
}
const maskCategories = Object.values(dictionary.categories).filter(category => category.action === "mask");
const matchers = [
  wordsRegex(maskCategories.filter(category => category.match === "substring").flatMap(category => category.words)),
  wordsRegex(maskCategories.filter(category => category.match === "whole_word").flatMap(category => category.words), true),
  ...dictionary.patterns.filter(pattern => pattern.action === "mask").map(pattern =>
    // 辞書内で二重にエスケープされた空白・Unicodeエスケープも意図どおり解釈する。
    new RegExp(pattern.regex.replace(/\\\\(?=[sSdDwWuUbB])/g, "\\"), pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`)),
].filter((matcher): matcher is RegExp => matcher !== null);
const allowed = wordsRegex(dictionary.allowlist);

/** 原文の表記を保ち、辞書のmask対象だけを固定の ** に置き換える。 */
export function maskNgWords(original: string): string {
  if (!original) return original;
  let normalized = "";
  const offsets: Range[] = [];
  for (const {segment,index} of segmenter.segment(original)) {
    const text = normalize(segment);
    normalized += text;
    for (let i=0;i<text.length;i++) offsets.push({start:index,end:index+segment.length});
  }
  const protectedRanges: Range[] = allowed ? [...normalized.matchAll(allowed)].map(match => ({start:match.index!,end:match.index!+match[0].length})) : [];
  const ranges: Range[] = [];
  for (const matcher of matchers) {
    for (const match of normalized.matchAll(matcher)) {
      const start = match.index!, end = start+match[0].length;
      if (end === start || protectedRanges.some(range => start < range.end && end > range.start)) continue;
      ranges.push({start:offsets[start].start,end:offsets[end-1].end});
    }
  }
  ranges.sort((a,b)=>a.start-b.start || b.end-a.end);
  const merged: Range[] = [];
  for (const range of ranges) {
    const previous = merged.at(-1);
    if (previous && range.start < previous.end) previous.end = Math.max(previous.end,range.end);
    else merged.push({...range});
  }
  let result = "", cursor = 0;
  for (const range of merged) { result += original.slice(cursor,range.start)+"**"; cursor=range.end; }
  return result+original.slice(cursor);
}
