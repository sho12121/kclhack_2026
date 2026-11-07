import assert from "node:assert/strict";
import {test} from "node:test";
import {maskNgWords} from "../src/lib/ng-word-filter.ts";
test("NG語: 固定の2つの星に置換し、通常の文章・許可語を保持する",()=>{
 assert.equal(maskNgWords("お前は無能"),"**");
 assert.equal(maskNgWords("バカンスの映画。でもお前は無能。"),"バカンスの映画。でも**。");
 assert.equal(maskNgWords("映画の感想を話そう。"),"映画の感想を話そう。");
});
test("NG語: 英語の単語境界・全角・大小文字を扱い、無関係な単語を壊さない",()=>{
 assert.equal(maskNgWords("ＦＵＣＫ"),"**");
 assert.equal(maskNgWords("class cocktail therapist"),"class cocktail therapist");
 assert.equal(maskNgWords("fuck fuck"),"** **");
});
test("NG語: Unicode・原文の表記を保持し、正規化で変化した箇所だけ伏せる",()=>{
 assert.equal(maskNgWords("🎬　ＦＵＣＫ！"),"🎬　**！");
 assert.equal(maskNgWords("死 ね"),"**");
 assert.equal(maskNgWords("🖕"),"**");
});
