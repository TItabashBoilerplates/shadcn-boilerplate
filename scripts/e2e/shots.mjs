#!/usr/bin/env node
/**
 * shots.mjs — Maestro の実行結果を「順番に見られる 1 本の道」にまとめる
 *
 * ## なぜ要るのか
 *
 * Maestro 2.4.0 が `--test-output-dir` に吐くのは次の形（**公式ドキュメントに
 * 載っているツリーとは違う**ので、実物に合わせてある）:
 *
 *   e2e-results/maestro/
 *   ├── screenshots/<name>.png                  … takeScreenshot の出力。**全フロー混在の平置き**
 *   └── <session>/
 *       ├── commands-(<Flow name>).json         … 実行したステップが順番に 1 件ずつ
 *       └── screenshot-*-(<Flow name>).png      … **失敗したステップ**の自動スクショ
 *
 * つまり「撮った順」も「どのフローのものか」も、そのままでは分からない。
 * このスクリプトは
 *
 *   1. 出てきた PNG を `shots/NNN-<name>.png` へ**通し番号つきで**複製し、
 *   2. `commands-*.json` と突き合わせた `storyboard.html` を作る
 *
 * `--watch` を付けると**実行中に**新しいスクショを拾って複製し、そのパスを
 * 1 行ずつ標準出力に出す。人（や AI エージェント）が走っている最中に順番に覗ける。
 *
 * ## 使い方
 *   node scripts/e2e/shots.mjs --watch [--reset] [--dir <results>]
 *   node scripts/e2e/shots.mjs [--dir <results>]
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const watch = args.includes("--watch");
const reset = args.includes("--reset");
const dirIndex = args.indexOf("--dir");
const ROOT =
	process.env.DEVENV_ROOT ??
	execFileSync("git", ["rev-parse", "--show-toplevel"], {
		encoding: "utf8",
	}).trim();
const RESULTS =
	dirIndex >= 0
		? path.resolve(args[dirIndex + 1])
		: path.join(ROOT, "e2e-results", "maestro");
const SHOTS = path.join(RESULTS, "shots");
const STATE = path.join(SHOTS, ".sources.json");

const seen = new Set();
let sequence = 0;

// ---------------------------------------------------------------- 収集

/** RESULTS 配下の PNG を、mtime の昇順（= 撮られた順）で列挙する */
function findScreenshots() {
	const found = [];
	const walk = (dir) => {
		let entries;
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				if (full !== SHOTS) walk(full);
			} else if (entry.name.endsWith(".png")) {
				found.push(full);
			}
		}
	};
	walk(RESULTS);
	return found
		.map((file) => ({ file, mtime: fs.statSync(file).mtimeMs }))
		.sort((a, b) => a.mtime - b.mtime)
		.map((entry) => entry.file);
}

/**
 * 平置き用の名前を作る。
 *
 * - `screenshots/<name>.png` … フローが自分で撮ったもの。名前は
 *   `<platform>-<suite>-<flow>-NN-<desc>` の規約で**全体で一意**にしてある。
 * - `<session>/screenshot-…-(<Flow name>).png` … **失敗**の自動スクショ。
 *   一目で分かるよう `FAILED-` を付ける。
 */
function flatName(source) {
	const base = path.basename(source, ".png");
	sequence += 1;
	const seq = String(sequence).padStart(3, "0");
	const failure = base.match(/^screenshot-.*?-\((.+)\)$/);
	if (failure) {
		return `${seq}-FAILED-${failure[1].replace(/[^\w.-]+/g, "-")}.png`;
	}
	return `${seq}-${base}.png`;
}

function collect({ quiet = false } = {}) {
	const fresh = [];
	for (const source of findScreenshots()) {
		if (seen.has(source)) continue;
		// 書き込み途中のファイルを掴まない（サイズ 0 は次の周回に回す）
		let size = 0;
		try {
			size = fs.statSync(source).size;
		} catch {
			continue;
		}
		if (size === 0) continue;
		seen.add(source);
		const target = path.join(SHOTS, flatName(source));
		fs.copyFileSync(source, target);
		fresh.push(target);
		if (!quiet) process.stdout.write(`${target}\n`);
	}
	if (fresh.length > 0) {
		fs.writeFileSync(STATE, JSON.stringify([...seen]));
	}
	return fresh;
}

// ---------------------------------------------------------------- storyboard

/** `commands-(<Flow name>).json` を読み、フローごとのステップ列を返す */
function readFlows() {
	const flows = [];
	for (const entry of fs.readdirSync(RESULTS, { withFileTypes: true })) {
		if (
			!entry.isDirectory() ||
			entry.name === "shots" ||
			entry.name === "screenshots"
		)
			continue;
		const session = path.join(RESULTS, entry.name);
		for (const file of fs.readdirSync(session)) {
			const match = file.match(/^commands-\((.+)\)\.json$/);
			if (!match) continue;
			let commands = [];
			try {
				commands = JSON.parse(
					fs.readFileSync(path.join(session, file), "utf8"),
				);
			} catch {
				commands = [];
			}
			flows.push({
				name: match[1],
				mtime: fs.statSync(path.join(session, file)).mtimeMs,
				commands: Array.isArray(commands) ? commands : [],
			});
		}
	}
	return flows.sort((a, b) => a.mtime - b.mtime);
}

/** commands の 1 エントリを「人が読める 1 行」にする */
function describe(entry) {
	const command = entry.command ?? {};
	const key = Object.keys(command).find((k) => k.endsWith("Command"));
	const status = entry.metadata?.status ?? "";
	if (!key) return { label: "step", status, shot: null };
	const body = command[key] ?? {};
	const kind = key.replace(/Command$/, "");
	const shot = kind === "takeScreenshot" ? (body.path ?? null) : null;
	const detail =
		body.label ??
		body.text ??
		body.path ??
		body.link ??
		body.selector?.textRegex ??
		body.selector?.idRegex ??
		body.condition?.visible?.textRegex ??
		body.sourceDescription?.split("/").pop() ??
		body.config?.name ??
		"";
	return { label: detail ? `${kind}: ${detail}` : kind, status, shot };
}

function dataUri(file) {
	return `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`;
}

function escapeHtml(value) {
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function buildStoryboard() {
	const shots = fs
		.readdirSync(SHOTS)
		.filter((name) => name.endsWith(".png"))
		.sort();
	const flows = readFlows();

	/** スクショ名 → 平置きファイル名（`NNN-` 接頭辞つき）の逆引き */
	const shotFile = (name) =>
		shots.find((file) => file.replace(/^\d{3}-/, "") === `${name}.png`) ?? null;
	/** 失敗スクショはフロー名から引く */
	const failureFile = (flowName) =>
		shots.find((file) =>
			file.includes(`FAILED-${flowName.replace(/[^\w.-]+/g, "-")}`),
		) ?? null;

	const sections = flows
		.map((flow) => {
			const failed = flow.commands.some(
				(c) => String(c.metadata?.status ?? "").toUpperCase() === "FAILED",
			);
			const rows = flow.commands
				.map((entry) => {
					const { label, status, shot } = describe(entry);
					const tone = String(status).toUpperCase();
					const file = shot ? shotFile(shot) : null;
					const image = file
						? `<img loading="lazy" alt="${escapeHtml(shot)}" src="${dataUri(path.join(SHOTS, file))}">`
						: "";
					return `<li class="step ${tone.toLowerCase()}">
  <span class="badge">${tone || "—"}</span><code>${escapeHtml(label)}</code>
  ${image ? `<figure>${image}<figcaption>${escapeHtml(file)}</figcaption></figure>` : ""}
</li>`;
				})
				.join("\n");

			const failShot = failed ? failureFile(flow.name) : null;
			const failBlock = failShot
				? `<div class="failure"><h3>失敗した時点の画面</h3><figure><img alt="failure" src="${dataUri(path.join(SHOTS, failShot))}"><figcaption>${escapeHtml(failShot)}</figcaption></figure></div>`
				: "";

			return `
<section class="flow ${failed ? "failed" : "passed"}">
  <h2>${escapeHtml(flow.name)} <span class="verdict">${failed ? "FAILED" : "PASSED"}</span></h2>
  ${failBlock}
  <ol class="steps">${rows}</ol>
</section>`;
		})
		.join("\n");

	const html = `<title>Maestro Storyboard</title>
<style>
  :root { color-scheme: light dark; --bg:#fff; --fg:#141414; --muted:#6b6b6b; --line:#e4e4e4; --ok:#0a7a5a; --ng:#c62828; --card:#fafafa; }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) { --bg:#121212; --fg:#ededed; --muted:#9a9a9a; --line:#2c2c2c; --card:#1a1a1a; }
  }
  :root[data-theme="dark"] { --bg:#121212; --fg:#ededed; --muted:#9a9a9a; --line:#2c2c2c; --card:#1a1a1a; }
  * { box-sizing:border-box; }
  body { background:var(--bg); color:var(--fg); font:15px/1.65 ui-sans-serif,system-ui,-apple-system,"Helvetica Neue",sans-serif; margin:0; padding:28px 20px 60px; }
  header { max-width:1100px; margin:0 auto 28px; }
  h1 { font-size:1.5rem; margin:0 0 4px; letter-spacing:-.01em; }
  .meta { color:var(--muted); margin:0; font-size:.85rem; }
  .flow { max-width:1100px; margin:0 auto 22px; border:1px solid var(--line); border-radius:14px; padding:18px 20px; background:var(--card); }
  .flow h2 { font-size:1.02rem; margin:0 0 14px; display:flex; gap:10px; align-items:center; }
  .verdict { font-size:.68rem; letter-spacing:.08em; padding:3px 9px; border-radius:999px; border:1px solid currentColor; font-weight:600; }
  .passed .verdict { color:var(--ok); } .failed .verdict { color:var(--ng); }
  .steps { list-style:none; margin:0; padding:0; }
  .step { display:grid; grid-template-columns:88px 1fr; gap:10px; align-items:start; padding:6px 0; border-top:1px solid var(--line); font-size:.82rem; }
  .step:first-child { border-top:0; }
  .step code { color:var(--muted); word-break:break-word; }
  .step.failed code { color:var(--ng); font-weight:600; }
  .badge { font-size:.62rem; letter-spacing:.06em; color:var(--muted); padding-top:3px; }
  .step.failed .badge { color:var(--ng); }
  figure { grid-column:2; margin:8px 0 4px; max-width:520px; }
  img { width:100%; border:1px solid var(--line); border-radius:8px; display:block; background:#fff; }
  figcaption { color:var(--muted); font-size:.68rem; margin-top:4px; word-break:break-all; }
  .failure { border:1px solid var(--ng); border-radius:10px; padding:12px 14px; margin-bottom:14px; }
  .failure h3 { margin:0 0 8px; font-size:.8rem; color:var(--ng); letter-spacing:.04em; }
  .empty { color:var(--muted); max-width:1100px; margin:0 auto; }
</style>
<header>
  <h1>Maestro Storyboard</h1>
  <p class="meta">${flows.length} flows · ${shots.length} screenshots · ${new Date().toISOString()}</p>
</header>
${sections || '<p class="empty">結果がまだありません。</p>'}
`;

	const out = path.join(RESULTS, "storyboard.html");
	fs.writeFileSync(out, html);
	return { out, flows: flows.length, shots: shots.length };
}

// ---------------------------------------------------------------- main
fs.mkdirSync(RESULTS, { recursive: true });
if (reset && fs.existsSync(SHOTS))
	fs.rmSync(SHOTS, { recursive: true, force: true });
fs.mkdirSync(SHOTS, { recursive: true });

for (const name of fs.readdirSync(SHOTS)) {
	const match = name.match(/^(\d{3})-/);
	if (match) sequence = Math.max(sequence, Number(match[1]));
}
if (fs.existsSync(STATE)) {
	for (const source of JSON.parse(fs.readFileSync(STATE, "utf8")))
		seen.add(source);
}

if (watch) {
	process.stdout.write(`# watching ${RESULTS}\n`);
	collect();
	setInterval(() => collect(), 1000);
} else {
	collect({ quiet: true });
	const summary = buildStoryboard();
	process.stdout.write(
		`storyboard: ${summary.out} (${summary.flows} flows, ${summary.shots} screenshots)\n`,
	);
}
