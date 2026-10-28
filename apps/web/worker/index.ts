// Entri Worker web Surau: seluruh permintaan diserahkan ke vinext (App Router di workerd). Diekspor
// ulang apa adanya supaya entri tambahan adapter cache (Response Store) ikut terpasang.
export { default } from "vinext/server/fetch-handler";
