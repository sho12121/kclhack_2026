"use client";

import { useState } from "react";
import { SearchForm } from "@/components/movies/search-form";

export function SearchFormPreview() {
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  return (
    <>
      <p><label><input type="checkbox" checked={isLoading} onChange={(event) => setIsLoading(event.target.checked)} /> 検索中の見た目にする</label></p>
      <SearchForm onSearch={setSubmittedQuery} isLoading={isLoading} />
      <p role="status">親に渡された検索語：{submittedQuery || "（未送信）"}</p>
    </>
  );
}
