import { ArabicInline } from "../arabic";

/** Contoh kueri: yang berhuruf Arab lewat ArabicInline (font Naskh, `lang="ar"`). */
export function ExampleText({ text }: { text: string }) {
  return /\p{Script=Arabic}/u.test(text) ? <ArabicInline>{text}</ArabicInline> : <>{text}</>;
}
