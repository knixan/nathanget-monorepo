// PreToolUse(Bash): stoppar `git commit` och `git push` från AI-agenter.
// Användaren committar själv (se AGENTS.md § Git). Exit 2 = blockera, och
// texten på stderr skickas tillbaka till agenten.
//
// Fail-open: kan vi inte läsa indata släpps kommandot igenom – en hook som
// stoppar allt på grund av egna buggar är värre än det den skyddar mot.
import { readFileSync } from "node:fs";

let command = "";
try {
  const input = JSON.parse(readFileSync(0, "utf8"));
  command = String(input?.tool_input?.command ?? "");
} catch {
  process.exit(0);
}

// `git commit`, `git push`, även efter && / ; / | och med flaggor före (git -C x commit).
const blockerat = /(^|[;&|(]\s*|\s)git(\s+-[^\s]+(\s+[^\s-][^\s]*)?)*\s+(commit|push)\b/;

if (blockerat.test(command)) {
  console.error(
    [
      "Stoppat: agenter får inte committa eller pusha i det här repot (AGENTS.md § Git).",
      "Skriv i stället ett commit-meddelande till användaren, som committar själv.",
    ].join("\n"),
  );
  process.exit(2);
}

process.exit(0);
