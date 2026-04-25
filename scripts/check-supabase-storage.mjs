import fs from "node:fs";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

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

async function listBucketFiles(supabase, bucket, prefix = "") {
  const { data, error } = await supabase.storage.from(bucket).list(prefix, {
    limit: 1000,
    sortBy: { column: "name", order: "asc" }
  });

  if (error) {
    return { bucket, error: error.message, files: [] };
  }

  const files = [];

  for (const item of data ?? []) {
    const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id) {
      files.push({
        path: itemPath,
        size: item.metadata?.size ?? null,
        updatedAt: item.updated_at ?? null
      });
    } else {
      const nested = await listBucketFiles(supabase, bucket, itemPath);
      files.push(...nested.files);
    }
  }

  return { bucket, files };
}

loadEnvFile(".env.local");

const missing = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter(
  (name) => !process.env[name]
);

if (missing.length) {
  throw new Error(`Missing Supabase env variables: ${missing.join(", ")}`);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

const results = await Promise.all(
  ["post-media", "chat-media"].map((bucket) => listBucketFiles(supabase, bucket))
);

for (const result of results) {
  if (result.error) {
    console.log(`${result.bucket}: error: ${result.error}`);
    continue;
  }

  const totalBytes = result.files.reduce((sum, item) => sum + (item.size ?? 0), 0);
  console.log(`${result.bucket}: ${result.files.length} files, ${totalBytes} bytes`);

  for (const file of result.files.slice(0, 50)) {
    console.log(`  ${file.path} (${file.size ?? "unknown"} bytes)`);
  }

  if (result.files.length > 50) {
    console.log(`  ... ${result.files.length - 50} more`);
  }
}
