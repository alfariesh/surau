import type { Metadata } from "next";

import { Button, Card, Chip } from "@heroui/react";

import { ArabicInline, ArabicText } from "../../components/arabic";
import { SurauMark } from "../../components/shell/logo";
import { BASMALAH } from "../../content/basmalah";

// SEMENTARA (S04 langkah 1, T-08 belum dijawab): pembanding dua opsi palet untuk pemilik.
// Dihapus setelah pemilik memilih. Teks di halaman ini sengaja tidak masuk i18n karena tidak dirilis.

export const metadata: Metadata = {
  title: "Pilihan desain (sementara)",
  robots: { index: false, follow: false },
};

const OPTIONS = [
  {
    key: "zaitun",
    name: "Opsi A · Zaitun",
    note: "Kertas hangat, aksen hijau zaitun. Huruf Arab: Noto Naskh Arabic (modern, rapi, mudah dibaca di layar kecil).",
  },
  {
    key: "lazuardi",
    name: "Opsi B · Lazuardi",
    note: "Kertas sejuk, aksen biru lazuardi. Huruf Arab: Amiri (klasik, mirip cetakan kitab Bulaq).",
  },
] as const;

export default function DesignOptionsPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Pilihan desain Surau (sementara)</h1>
        <p className="text-muted text-sm">
          Dua opsi, masing-masing dalam tema terang dan gelap. Font teks Indonesia sama untuk
          keduanya: Plus Jakarta Sans.
        </p>
      </header>
      {OPTIONS.map((option) => (
        <section key={option.key} className="flex flex-col gap-3">
          <div>
            <h2 className="text-lg font-semibold">{option.name}</h2>
            <p className="text-muted text-sm">{option.note}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {(["light", "dark"] as const).map((mode) => (
              <Sample key={mode} mode={mode} palette={option.key} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}

function Sample({ mode, palette }: { mode: "light" | "dark"; palette: string }) {
  return (
    <div
      className={`palet-${palette} ${mode} bg-background text-foreground flex flex-col gap-5 rounded-3xl border border-border p-5`}
      data-theme={mode}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <SurauMark className="size-8" />
          <div className="flex flex-col">
            <span className="font-semibold leading-tight">Surau</span>
            <span className="text-muted text-xs leading-tight">Pintu ke kitab klasik</span>
          </div>
        </div>
        <Chip color="accent" size="sm" variant="soft">
          {mode === "light" ? "terang" : "gelap"}
        </Chip>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-xl font-semibold tracking-tight">
          Asisten riset kitab klasik Islam, dalam bahasa Indonesia
        </p>
        <p className="text-muted text-sm">
          Setiap jawaban punya alamat: kitab, jilid, halaman cetak, dan kutipan Arab aslinya.
        </p>
      </div>
      <Card className="items-center gap-2 py-6">
        <ArabicText className="text-3xl">{BASMALAH.text}</ArabicText>
        <p className="text-muted text-xs">
          {BASMALAH.ref} · {BASMALAH.source}
        </p>
      </Card>
      <p className="text-sm leading-relaxed">
        Contoh teks campuran: Surau menampilkan <ArabicInline>{BASMALAH.text}</ArabicInline> di
        tengah kalimat tanpa membalik arah halaman.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm">Kenali Surau</Button>
        <Button size="sm" variant="tertiary">
          Lihat kode sumber
        </Button>
      </div>
    </div>
  );
}
