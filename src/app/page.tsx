import { MovieSearch } from "@/components/movies/movie-search";

export default function HomePage() {
  return (
    <>
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">A FILM. A FEELING. A CONVERSATION.</p>
        <h1 id="page-title">次に語りたい映画を、<br /><span>見つけよう。</span></h1>
        <p className="hero-description">心に残った一本も、これから出会う一本も。<br />映画のタイトルから、あなたの気になる作品を探してみませんか。</p>
      </section>
      <MovieSearch />
    </>
  );
}
