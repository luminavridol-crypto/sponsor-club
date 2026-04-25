import fs from "node:fs";
import process from "node:process";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

function loadEnvFile(fileName) {
  if (!fs.existsSync(fileName)) return;

  for (const line of fs.readFileSync(fileName, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (!process.env[key]) {
      process.env[key] = rawValue.trim().replace(/^["']|["']$/g, "");
    }
  }
}

loadEnvFile(".env.local");

const missing = [
  "R2_BUCKET_NAME",
  "R2_ENDPOINT",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY"
].filter((name) => !process.env[name]);

if (missing.length) {
  throw new Error(`Missing R2 env variables: ${missing.join(", ")}`);
}

const client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT.replace(/\/$/, ""),
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

const result = await client.send(
  new ListObjectsV2Command({
    Bucket: process.env.R2_BUCKET_NAME,
    MaxKeys: 1
  })
);

console.log(
  JSON.stringify(
    {
      ok: true,
      bucket: process.env.R2_BUCKET_NAME,
      keyCount: result.KeyCount ?? 0
    },
    null,
    2
  )
);
