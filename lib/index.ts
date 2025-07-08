#!/usr/bin/env ts-node

/**
 * swagger-to-postman.ts
 *
 * Fetches an OpenAPI (Swagger) spec from a URL or local file,
 * converts it to a Postman Collection (v2.1), and writes the result
 * to disk.
 *
 * Usage (with ts-node):
 *   ts-node swagger-to-postman.ts \
 *     --input <spec-url-or-path> \
 *     --output <collection.json> \
 *     --header "Key: Value" \
 *     --header "Another: Header"
 */

import { Command } from 'commander';
import axios, { AxiosRequestHeaders } from 'axios';
import { readFileSync, writeFileSync } from 'fs';
import yaml from 'js-yaml';
import { convert as openapiToPostman } from 'openapi-to-postmanv2';


// ────────────────────────────────────────────────────────────────────────────────
// 1. Define the shape of our CLI options
// ────────────────────────────────────────────────────────────────────────────────
interface CliOptions {
  input: string;           // URL or file path to the OpenAPI spec
  output: string;          // Desired output file for the Postman collection
  header: string[];        // Optional array of "Key: Value" header strings
}


// ────────────────────────────────────────────────────────────────────────────────
// 2. Helper: Turn ["Key: Val", ...] into { Key: "Val", ... }
// ────────────────────────────────────────────────────────────────────────────────
function parseHeaders(rawHeaders: string[]): AxiosRequestHeaders {
  const headers = {} as AxiosRequestHeaders;
  for (const entry of rawHeaders) {
    const idx = entry.indexOf(':');
    if (idx < 0) {
      // Skip malformed entries
      continue;
    }
    const key = entry.slice(0, idx).trim();
    const val = entry.slice(idx + 1).trim();
    if (key) {
      headers[key] = val;
    }
  }
  return headers;
}


// ────────────────────────────────────────────────────────────────────────────────
// 3. Helper: Load the spec from HTTP or disk (supports JSON & YAML)
// ────────────────────────────────────────────────────────────────────────────────
async function loadSpec(
  source: string,
  headers = {} as AxiosRequestHeaders
): Promise<unknown> {
  // If it looks like an HTTP(S) URL, fetch it:
  if (/^https?:\/\//i.test(source)) {
    const response = await axios.get<unknown>(source, { headers });
    return response.data;
  }

  // Otherwise, treat as local file path:
  const raw = readFileSync(source, 'utf-8');

  // Try JSON parse; if it fails, fall back to YAML parse
  try {
    return JSON.parse(raw);
  } catch {
    return yaml.load(raw) as unknown;
  }
}


// ────────────────────────────────────────────────────────────────────────────────
// 4. Helper: Convert the spec object into a Postman Collection JSON file
// ────────────────────────────────────────────────────────────────────────────────
async function convertSpec(
  spec: string,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    // openapiToPostman takes an options object, then a callback:
    openapiToPostman(
      { type: 'json', data: spec },
      {},  // converter options (none for now)
      (err, result: any) => {
        if (err || !result.result) {
          // Conversion failed
          return reject(err || new Error(result.reason));
        }

        // Grab the generated collection (first output entry)
        const collection = result.output[0].data;
        // Write it prettily to disk
        writeFileSync(outputPath, JSON.stringify(collection, null, 2));
        console.log(`✅  Collection saved to ${outputPath}`);
        resolve();
      }
    );
  });
}


// ────────────────────────────────────────────────────────────────────────────────
// 5. Main: Wire up the CLI, load the spec, convert it, and handle errors
// ────────────────────────────────────────────────────────────────────────────────
async function main() {
  // Set up Commander to parse flags
  const program = new Command();

  program
    .name('swagger-to-postman')
    .description('Fetch an OpenAPI spec and convert to a Postman Collection')
    .requiredOption('-i, --input <path_or_url>', 'Spec URL or file path')
    .option('-o, --output <file>', 'Output filename', 'collection.postman.json')
    .option('-H, --header <header...>', 'Additional HTTP header(s)', [])
    .parse(process.argv);

  // Grab the parsed options
  const opts = program.opts<CliOptions>();
  // Convert header strings into an object
  const headers = parseHeaders(opts.header);

  try {
    // 1) Load the OpenAPI spec (from URL or file)
    const spec = await loadSpec(opts.input, headers) as string;

    // 2) Convert & write the Postman collection
    await convertSpec(spec, opts.output);
  } catch (error) {
    console.log(`EERRRRR`, error)
    console.error('❌  Error:', (error as Error).message);
    process.exit(1);
  }
}

// Invoke our main function
main();
