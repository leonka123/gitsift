import { scoreAllRepos } from "../src/lib/pipeline";

const count = scoreAllRepos();
console.log(`Scored ${count} repositories.`);
