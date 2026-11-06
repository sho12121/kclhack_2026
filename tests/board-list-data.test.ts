import assert from "node:assert/strict";
import { test } from "node:test";
import { parseBoardList } from "../src/lib/board-list-data.ts";
const board = { id:"11111111-1111-4111-8111-111111111111",title:"感想会",movie:{tmdbId:372058,title:"君の名は。",posterUrl:null,releaseDate:null,genres:["アニメーション"]},capacity:4,participantCount:2,startsAt:"2026-11-07T00:00:00Z",createdAt:"2026-11-06T00:00:00Z",allowGuests:true,isMember:false,isFavorite:true };
test("一覧更新: 件数・参加状態を取得し、会話本文など余分な項目は渡さない", () => {
  const result = parseBoardList({boards:[{...board,privateContent:"非公開"}]});
  assert.equal(result[0].participantCount,2); assert.equal(result[0].isFavorite,true);
  assert.equal("privateContent" in result[0],false);
  assert.deepEqual(parseBoardList({boards:[]}),[]);
});
test("一覧更新: 不完全な応答や壊れた参加人数・映画情報を拒否する", () => {
  for(const value of [null,{}, {boards:[{...board,participantCount:-1}]},{boards:[{...board,movie:null}]},{boards:[{...board,startsAt:"invalid"}]},{boards:[{...board,isMember:"yes"}]}])assert.throws(()=>parseBoardList(value));
});
