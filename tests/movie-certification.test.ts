import assert from "node:assert/strict";
import { test } from "node:test";
import { getJapaneseCertification, isGeneralAudience } from "../src/lib/movie-certification.ts";

const data = (...certifications: string[]) => ({
  results: [{ iso_3166_1: "JP", release_dates: certifications.map(certification => ({ certification })) }],
});

test("日本の年齢区分: 標準表記と実際に使われる数値表記を正規化する", () => {
  for (const [raw, expected] of [["G", "G"], ["PG12", "PG12"], ["12", "PG12"], ["15", "R15+"], ["R15+", "R15+"], ["R-18+", "R18+"]]) {
    assert.equal(getJapaneseCertification(data(raw)), expected);
  }
});

test("日本の年齢区分: 複数の公開版は厳しい方を採用し、空欄は無視する", () => {
  assert.equal(getJapaneseCertification(data("", "G", "15", "")), "R15+");
  assert.equal(getJapaneseCertification(data("R18+", "PG12")), "R18+");
});

test("日本の年齢区分: 他国の区分で日本の未分類を補わない", () => {
  assert.equal(getJapaneseCertification({ results: [
    { iso_3166_1: "US", release_dates: [{ certification: "G" }] },
    { iso_3166_1: "JP", release_dates: [{ certification: "" }] },
  ] }), null);
});

test("日本の年齢区分: 未登録・未知のコード・壊れたデータを安全扱いしない", () => {
  for (const value of [null, {}, { results: [] }, data(""), data("NR"), data("G", "不明"), { results: [{ iso_3166_1: "JP", release_dates: null }] }]) {
    assert.equal(getJapaneseCertification(value), null);
  }
});

test("一般向け判定: GとPG12だけを許可する", () => {
  assert.equal(isGeneralAudience("G"), true);
  assert.equal(isGeneralAudience("PG12"), true);
  assert.equal(isGeneralAudience("R15+"), false);
  assert.equal(isGeneralAudience("R18+"), false);
  assert.equal(isGeneralAudience(undefined), false);
});
