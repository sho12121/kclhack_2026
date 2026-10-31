import type { MovieCertification } from "../types/movie.ts";

const ranking: MovieCertification[] = ["G", "PG12", "R15+", "R18+"];

function normalize(value: string): MovieCertification | null {
  const code = value.trim().toUpperCase().replaceAll("-", "");
  if (code === "G") return "G";
  if (["PG12", "12"].includes(code)) return "PG12";
  if (["R15+", "R15", "15"].includes(code)) return "R15+";
  if (["R18+", "R18", "18"].includes(code)) return "R18+";
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** 日本の区分だけを確認。複数の公開版がある場合は最も厳しい区分を採用する。 */
export function getJapaneseCertification(data: unknown): MovieCertification | null {
  if (!isRecord(data) || !Array.isArray(data.results)) return null;
  let strictest: MovieCertification | null = null;
  for (const country of data.results) {
    if (!isRecord(country) || country.iso_3166_1 !== "JP") continue;
    if (!Array.isArray(country.release_dates)) return null;
    for (const release of country.release_dates) {
      if (!isRecord(release) || typeof release.certification !== "string") return null;
      if (!release.certification.trim()) continue;
      const certification = normalize(release.certification);
      if (!certification) return null;
      if (!strictest || ranking.indexOf(certification) > ranking.indexOf(strictest)) {
        strictest = certification;
      }
    }
  }
  return strictest;
}

export function isGeneralAudience(certification: MovieCertification | undefined) {
  return certification === "G" || certification === "PG12";
}
