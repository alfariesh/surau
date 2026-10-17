// Laporan Markdown eval retrieval (evals/reports/). Soal privat hanya muncul sebagai ID, jenis,
// dan peringkat: teks kueri, pertanyaan, dan lokasinya tidak pernah ditulis (laporan di-commit dan
// ringkasan CI publik), supaya holdout tidak bocor.
import type { LoadedQuestion, QuestionKind } from "./dataset.ts";
import { QUESTION_KINDS } from "./dataset.ts";
import { DEPTH, R2_GATE_HIT10, R2_MIN_OFFICIAL, aggregate, passesR2Gate } from "./metrics.ts";
import type { Judgement, Scores } from "./metrics.ts";

export interface ResultSummary {
  /** "j4 h61" + judul bagian paragraf cocok pertama (disalin dari DB). */
  label: string;
}

export interface QuestionRun {
  question: LoadedQuestion;
  judgement: Judgement;
  /** Hasil tanpa peringkat (kata Arab sangat umum): dinilai gagal. */
  unranked: boolean;
  goldCount: number;
  paths: string[];
  warning: string | null;
  /** null = tidak dihitung (hasil tanpa peringkat). */
  totalPages: number | null;
  top: ResultSummary[];
  ms: number;
}

export interface RunInfo {
  date: string;
  source: string;
  meta: Record<string, string>;
  gitSha: string;
  searchResultVersion: number;
  /** Soal privat ikut dijalankan (false = --publik-saja atau berkasnya tidak ada). */
  privateIncluded: boolean;
}

/** Bahasa kueri menurut hurufnya (sama dengan deteksi `searchText`): Arab, Indonesia, campuran. */
export function queryScript(kueri: string): "arab" | "indonesia" | "campuran" {
  const ar = /\p{Script=Arabic}/u.test(kueri);
  const la = /\p{Script=Latin}/u.test(kueri);
  return ar && la ? "campuran" : ar ? "arab" : "indonesia";
}

const pct = (x: number) => `${(x * 100).toFixed(1).replace(".", ",")}%`;
const dec = (x: number) => x.toFixed(3).replace(".", ",");

function scoreRow(name: string, s: Scores): string {
  if (s.n === 0) return `| ${name} | 0 | – | – | – | – |`;
  return `| ${name} | ${s.n} | ${pct(s.hit1)} | ${pct(s.hit5)} | ${pct(s.hit10)} | ${dec(s.mrr)} |`;
}

const HEAD = ["| Kelompok | Soal | hit@1 | hit@5 | hit@10 | MRR |", "|---|---|---|---|---|---|"];

function table(runs: readonly QuestionRun[]): string[] {
  const ranks = (rs: readonly QuestionRun[]) => rs.map((r) => r.judgement.rank);
  const lines = [...HEAD, scoreRow("**Semua**", aggregate(ranks(runs)))];
  for (const kind of QUESTION_KINDS) {
    const rs = runs.filter((r) => r.question.jenis === kind);
    if (rs.length > 0) lines.push(scoreRow(kind, aggregate(ranks(rs))));
  }
  for (const script of ["arab", "indonesia", "campuran"] as const) {
    const rs = runs.filter((r) => queryScript(r.question.kueri) === script);
    if (rs.length > 0) lines.push(scoreRow(`kueri ${script}`, aggregate(ranks(rs))));
  }
  for (const set of ["publik", "privat"] as const) {
    const rs = runs.filter((r) => r.question.set === set);
    if (rs.length > 0) lines.push(scoreRow(`set ${set}`, aggregate(ranks(rs))));
  }
  return lines;
}

const rankCell = (r: QuestionRun) =>
  r.unranked
    ? "tanpa peringkat"
    : r.judgement.rank === null
      ? `> ${DEPTH}`
      : String(r.judgement.rank);
const cell = (s: string) => s.replaceAll("|", "\\|").replaceAll("\n", " ");

export function officialRuns(runs: readonly QuestionRun[]): QuestionRun[] {
  return runs.filter((r) => r.question.disetujui_oleh !== null);
}

export function renderReport(info: RunInfo, runs: readonly QuestionRun[]): string {
  const official = officialRuns(runs);
  const gateScores = aggregate(official.map((r) => r.judgement.rank));
  const verdict = `**${passesR2Gate(gateScores) ? "LOLOS" : "BELUM LOLOS"}**`;
  const gate =
    official.length === 0
      ? "belum ada soal yang disetujui (T-12), gerbang belum bisa dinilai"
      : official.length < R2_MIN_OFFICIAL
        ? `baru ${official.length} soal disetujui (perlu ≥ ${R2_MIN_OFFICIAL}) → ${verdict}; hit@10 sementara ${pct(gateScores.hit10)}`
        : `hit@10 = ${pct(gateScores.hit10)} atas ${gateScores.n} soal disetujui → ${verdict} (syarat ≥ ${pct(R2_GATE_HIT10)}, minimal ${R2_MIN_OFFICIAL} soal)`;
  const m = info.meta;
  const lines = [
    `# Eval retrieval · ${info.date} · ${m["corpus_version"] ?? "?"}`,
    "",
    `- **Gerbang R2:** ${gate}`,
    `- **Korpus:** \`${m["corpus_version"] ?? "?"}\` (skema ${m["schema_version"] ?? "?"}, norm ${
      m["norm_version"] ?? "?"
    }, latin_norm ${m["latin_norm_version"] ?? "?"}, dibangun ${m["built_at"] ?? "?"}), sumber D1: ${info.source}`,
    `- **Kode:** \`${info.gitSha}\`, \`SEARCH_RESULT_VERSION\` ${info.searchResultVersion} · soal privat ${
      info.privateIncluded ? "ikut" : "**tidak ikut** (`--publik-saja` atau berkas tidak ada)"
    }`,
    `- **Cara ukur:** \`searchText(kueri, { limit: ${DEPTH} })\`; hasil benar = halaman yang masuk rentang lokasi benar atau memuat paragraf cocok di bagian lokasi benar (beserta turunannya). MRR dihitung atas ${DEPTH} halaman (0 bila tidak ada).`,
    "",
  ];
  if (official.length > 0) {
    lines.push(`## Set resmi (disetujui, ${official.length} soal)`, "", ...table(official), "");
  }
  lines.push(`## Semua soal (draf + disetujui, ${runs.length} soal)`, "", ...table(runs), "");

  const scattered = runs.filter(
    (r) => r.question.jenis === ("topik tersebar" satisfies QuestionKind),
  );
  if (scattered.length > 0) {
    const found = scattered.reduce((s, r) => s + r.judgement.foundAt10, 0);
    const total = scattered.reduce((s, r) => s + r.goldCount, 0);
    lines.push(
      `Topik tersebar: ${found} dari ${total} lokasi benar muncul di 10 teratas (informasi, bukan gerbang).`,
      "",
    );
  }

  lines.push(
    "## Per soal publik",
    "",
    "| ID | Jenis | Kueri | Peringkat | Disetujui | 3 teratas |",
    "|---|---|---|---|---|---|",
  );
  for (const r of runs.filter((x) => x.question.set === "publik")) {
    const q = r.question;
    lines.push(
      `| ${q.id} | ${q.jenis} | ${cell(q.kueri)} | ${rankCell(r)} | ${
        q.disetujui_oleh === null ? "draf" : "ya"
      } | ${cell(
        r.top
          .slice(0, 3)
          .map((t) => t.label)
          .join(" · ") || "(kosong)",
      )} |`,
    );
  }
  const priv = runs.filter((x) => x.question.set === "privat");
  if (priv.length > 0) {
    lines.push(
      "",
      "## Per soal privat (holdout; teks soal tidak ditulis)",
      "",
      "| ID | Jenis | Peringkat | Disetujui |",
      "|---|---|---|---|",
    );
    for (const r of priv) {
      lines.push(
        `| ${r.question.id} | ${r.question.jenis} | ${rankCell(r)} | ${
          r.question.disetujui_oleh === null ? "draf" : "ya"
        } |`,
      );
    }
  }
  const failed = runs.filter(
    (r) => r.question.set === "publik" && (r.judgement.rank === null || r.judgement.rank > 10),
  );
  if (failed.length > 0) {
    lines.push("", "## Soal publik yang gagal (di luar 10 teratas)", "");
    for (const r of failed) {
      const q = r.question;
      lines.push(
        `- **${q.id}** \`${cell(q.kueri)}\` (${r.unranked ? "tanpa peringkat, " : ""}jalur ${r.paths.join("+") || "-"}${
          r.warning === null ? "" : `, peringatan ${r.warning}`
        }, ${r.totalPages ?? "?"} halaman): lokasi benar ${q.lokasi_benar.map((l) => l.label).join(", ")}; 5 teratas: ${
          r.top
            .slice(0, 5)
            .map((t) => t.label)
            .join(" · ") || "(kosong)"
        }`,
      );
    }
  }
  const ms = runs.map((r) => r.ms).toSorted((a, b) => a - b);
  const median = ms[Math.floor(ms.length / 2)] ?? 0;
  lines.push("", `Waktu per kueri (median): ${median} ms, termasuk bolak-balik D1.`, "");
  return lines.join("\n");
}
