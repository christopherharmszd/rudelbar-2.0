import { randomBytes, scryptSync } from "node:crypto";

if (!process.stdin.isTTY) throw new Error("Bitte in einem Terminal starten.");
process.stdout.write("Passwort für den neuen Redaktionszugang: ");
process.stdin.setRawMode(true);
let password = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => {
  for (const char of chunk) {
    if (char === "\r" || char === "\n") {
      process.stdin.setRawMode(false);
      process.stdout.write("\n");
      if (password.length < 12) { console.error("Mindestens 12 Zeichen erforderlich."); process.exit(1); }
      const salt = randomBytes(16).toString("hex");
      console.log(`${salt}:${scryptSync(password, salt, 64).toString("hex")}`);
      password = "";
      process.exit(0);
    }
    if (char === "\u0003") { process.stdin.setRawMode(false); process.exit(1); }
    if (char === "\u007f") password = password.slice(0, -1);
    else password += char;
  }
});
