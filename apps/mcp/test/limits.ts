// Batas pemakaian di tes (vitest.config.ts): kecil, supaya tes batas bisa menghabiskannya. Tes lain
// memakai IP berbeda per kasus. File ini diimpor config (Node) dan tes (workerd), jadi tanpa impor.
export const TEST_TOOL_LIMIT = 20;
export const TEST_SEARCH_LIMIT = 5;
