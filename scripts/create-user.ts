/**
 * CLI to create (or reset the password of) the single app user.
 *   npm run create-user
 * Prompts for email, optional name, and a hidden password. Never prints or
 * stores the plaintext password.
 */
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env into process.env before importing anything that needs DATABASE_URL.
function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const m = /^\s*([\w.]+)\s*=\s*(.*)?\s*$/.exec(line);
      if (!m) continue;
      let val = (m[2] ?? "").trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!(m[1] in process.env)) process.env[m[1]] = val;
    }
  } catch {
    // no .env — rely on the ambient environment
  }
}

// Buffered line reader for stdin — deterministic for both an interactive TTY
// (cooked mode, per-line) and piped input (tests/automation).
const stdin = process.stdin;
stdin.setEncoding("utf8");
let buf = "";
const lineQueue: string[] = [];
let pending: ((line: string) => void) | null = null;
let rawActive = false;

function pump() {
  let i: number;
  while ((i = buf.indexOf("\n")) >= 0) {
    lineQueue.push(buf.slice(0, i).replace(/\r$/, ""));
    buf = buf.slice(i + 1);
  }
  if (pending && lineQueue.length) {
    const resolve = pending;
    pending = null;
    resolve(lineQueue.shift()!);
  }
}

stdin.on("data", (chunk: string) => {
  if (rawActive) return; // hidden TTY handler owns the stream
  buf += chunk;
  pump();
});
stdin.on("end", () => {
  if (buf.length) {
    lineQueue.push(buf.replace(/\r?\n$/, ""));
    buf = "";
  }
  pump();
});

function readLine(): Promise<string> {
  return new Promise((resolve) => {
    if (lineQueue.length) return resolve(lineQueue.shift()!);
    pending = resolve;
    stdin.resume();
    pump();
  });
}

function prompt(query: string): Promise<string> {
  process.stdout.write(query);
  return readLine().then((v) => v.trim());
}

function promptHidden(query: string): Promise<string> {
  process.stdout.write(query);
  // Non-TTY (piped): no echo to hide — just read the line.
  if (!stdin.isTTY || !stdin.setRawMode) {
    return readLine().then((v) => {
      process.stdout.write("\n");
      return v;
    });
  }
  // TTY: raw mode so keystrokes aren't echoed.
  return new Promise((resolve) => {
    rawActive = true;
    stdin.setRawMode!(true);
    let value = "";
    const onRaw = (chunk: string) => {
      for (const ch of chunk) {
        const code = ch.charCodeAt(0);
        if (code === 13 || code === 10 || code === 4) {
          stdin.setRawMode!(false);
          stdin.removeListener("data", onRaw);
          rawActive = false;
          process.stdout.write("\n");
          return resolve(value);
        }
        if (code === 3) {
          process.stdout.write("\n");
          process.exit(1);
        } else if (code === 127 || code === 8) {
          value = value.slice(0, -1);
        } else if (code >= 32) {
          value += ch;
        }
      }
    };
    stdin.on("data", onRaw);
    stdin.resume();
  });
}

async function main() {
  loadEnv();
  const { db } = await import("../src/lib/db");
  const { hashPassword } = await import("../src/lib/password");
  const { emailSchema, passwordSchema } = await import(
    "../src/lib/validation-auth"
  );

  console.log("\nCreate / reset the app user\n");

  const email = emailSchema.safeParse(await prompt("Email: "));
  if (!email.success) {
    console.error("\n✗ Invalid email address.");
    process.exit(1);
  }
  const name = (await prompt("Name (optional): ")) || null;

  const password = await promptHidden("Password: ");
  const pw = passwordSchema.safeParse(password);
  if (!pw.success) {
    console.error(`\n✗ ${pw.error.issues[0].message}.`);
    process.exit(1);
  }
  const confirm = await promptHidden("Confirm password: ");
  if (confirm !== password) {
    console.error("\n✗ Passwords do not match.");
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const existing = await db.user.findUnique({ where: { email: email.data } });
  if (existing) {
    await db.user.update({
      where: { email: email.data },
      data: {
        passwordHash,
        name: name ?? existing.name,
        failedLogins: 0,
        lockedUntil: null,
      },
    });
    console.log(`\n✓ Updated password for ${email.data}.`);
  } else {
    await db.user.create({
      data: { email: email.data, name, passwordHash },
    });
    console.log(`\n✓ Created user ${email.data}.`);
  }

  await db.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
