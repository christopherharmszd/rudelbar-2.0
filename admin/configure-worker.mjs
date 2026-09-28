import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { stdin, stdout } from "node:process";
import { passwordVerifier } from "./worker.mjs";

if (!process.env.SANITY_EDITOR_TOKEN) {
  throw new Error("SANITY_EDITOR_TOKEN fehlt. Starte das Skript mit --env-file=admin/.env.local aus dem Repository.");
}

const interactive = process.argv.includes("--prompt");
let password;
if (interactive) {
  if (!stdin.isTTY) throw new Error("Für --prompt wird ein Terminal benötigt.");
  stdout.write("Neues Redaktionspasswort (mindestens 16 Zeichen): ");
  password = await new Promise((resolve, reject) => {
    let value = "";
    stdin.setRawMode(true);
    stdin.setEncoding("utf8");
    stdin.resume();
    const finish = result => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
      result === null ? reject(new Error("Abgebrochen.")) : resolve(result);
    };
    const onData = chunk => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") return finish(value);
        if (char === "\u0003") return finish(null);
        if (char === "\u007f") value = value.slice(0, -1);
        else value += char;
      }
    };
    stdin.on("data", onData);
  });
} else {
  password = randomBytes(18).toString("base64url");
}
if (password.length < 16) throw new Error("Das Redaktionspasswort muss mindestens 16 Zeichen haben.");

const secret = randomBytes(48).toString("base64url");
const secrets = {
  SANITY_EDITOR_TOKEN: process.env.SANITY_EDITOR_TOKEN,
  RUDELBAR_SESSION_SECRET: secret,
  RUDELBAR_PASSWORD_VERIFIER: await passwordVerifier(secret, password),
};

const child = spawn(new URL("./node_modules/.bin/wrangler", import.meta.url).pathname, ["secret", "bulk"], {
  cwd: new URL(".", import.meta.url).pathname,
  env: process.env,
  stdio: ["pipe", "inherit", "inherit"],
});
child.stdin.end(JSON.stringify(secrets));
const status = await new Promise(resolve => child.on("exit", resolve));
if (status !== 0) throw new Error(`Cloudflare hat die Geheimnisse nicht übernommen (Status ${status}).`);
if (interactive) console.log("Redaktionspasswort geändert. Bestehende Anmeldungen sind abgemeldet.");
else console.log(`Neues Redaktionspasswort (einmalig notieren): ${password}`);
