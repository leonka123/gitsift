/** Quality distribution and spot checks: npx tsx scripts/quality.ts */
import { getDb } from "../src/db/client";

const db = getDb();
const names = [
  "calmrocks/ai-engineer-notebooks",
  "FengZhenfei/carrel",
  "koala73/worldmonitor",
  "alibaba/open-code-review",
  "public-apis/public-apis",
  "freeCodeCamp/freeCodeCamp",
];

console.log("SPOT CHECK");
console.table(
  db
    .prepare(
      `select full_name, quality, bot_score, stars, round(stars_per_day,1) as per_day,
              substr(description,1,70) as description
       from repos where full_name in (${names.map(() => "?").join(",")})`,
    )
    .all(...names),
);

console.log("\nDISTRIBUTION");
console.table(
  db
    .prepare(
      `select case
                when quality >= 0.75 then '0.75+'
                when quality >= 0.6 then '0.60-0.75'
                when quality >= 0.42 then '0.42-0.60'
                when quality >= 0.3 then '0.30-0.42'
                else '<0.30' end as band,
              count(*) as repos
       from repos group by band order by band desc`,
    )
    .all(),
);

console.log("\nFILTERED BUT HIGH HEAT");
console.table(
  db
    .prepare(
      `select full_name, quality, heat, stars, substr(description,1,60) as description
       from repos where quality < 0.42 order by heat desc limit 10`,
    )
    .all(),
);
