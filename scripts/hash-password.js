#!/usr/bin/env node
// Generate a salted scrypt hash for STUDIO_PASSWORD_HASH.
//
//   npm run hash-password                 # prompts (input hidden on a TTY)
//   npm run hash-password -- "my secret"  # from an argument (lands in shell history)
//   echo -n "my secret" | npm run hash-password --silent
//
// Paste the printed value into .env as STUDIO_PASSWORD_HASH=... (no quotes needed).

import readline from "node:readline";
import { hashPassword } from "../server/lib/password.js";

async function readHidden(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stderr, terminal: true });
    rl._writeToOutput = (text) => {
      // Echo the prompt only, never the typed characters.
      if (text.includes(prompt)) {
        process.stderr.write(text);
      }
    };
    rl.question(prompt, (answer) => {
      rl.close();
      process.stderr.write("\n");
      resolve(answer);
    });
  });
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8").replace(/\r?\n$/, "");
}

async function main() {
  let password = process.argv[2];
  if (password === undefined) {
    if (process.stdin.isTTY) {
      password = await readHidden("Studio password: ");
      const confirm = await readHidden("Repeat password: ");
      if (password !== confirm) {
        console.error("Passwords do not match.");
        process.exit(1);
      }
    } else {
      password = await readStdin();
    }
  }

  if (!password) {
    console.error("Password must not be empty.");
    process.exit(1);
  }
  if (password.length < 10) {
    console.error("Warning: passwords shorter than 10 characters are easy to guess.");
  }

  console.log(await hashPassword(password));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
