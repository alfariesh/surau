import { DatabaseSync } from "node:sqlite";
const db = new DatabaseSync("data/build/surau-corpus-kitab-v10.sqlite", { readOnly: true });
for (const q of process.argv.slice(2)) console.log(JSON.stringify(db.prepare(q).all()));
