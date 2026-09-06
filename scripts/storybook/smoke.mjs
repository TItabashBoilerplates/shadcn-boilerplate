#!/usr/bin/env node
/**
 * 全ストーリーを headless で開き、**空描画とページエラー**を検知する。
 *
 *   storybook-smoke                             # storybook-static をビルド済み前提
 *   storybook-smoke --url http://localhost:6006 # 起動中の Storybook を見る
 *   storybook-smoke --filter "Apps/Mobile"      # title の前方一致で絞る
 *   storybook-smoke --concurrency 8
 *
 * ■ なぜ要るのか
 *   Storybook は**ビルドが通っても実行時に落ちる**壊れ方をする。実際に起きたもの:
 *
 *   | 症状 | 原因 |
 *   |---|---|
 *   | ストーリーが空の div になる | mobile のストーリーが `SafeAreaProvider` の外で描かれた |
 *   | 本番ビルドだけ全ストーリーが落ちる | RNW 内部まで import 書き換えされ循環参照になった |
 *
 *   どちらも `build-storybook` は成功し、`ci-check`（lint / format / type-check）も
 *   `unit-test` も通る。**描画を見るまで誰も気づけない**
 *   （`.claude/rules/ui-testing.md`「ビルドが通ったで終わらせない」）。
 *
 * ■ ここで見るもの / 見ないもの
 *   見る  : ストーリーが 1 要素でも描けたか / ページエラーが出ていないか
 *   見ない: 見た目・配色・レイアウト（人が Storybook を見る / 撮影して比べる領域）
 *
 *   「描けたか」だけに絞るのは、**壊れ方が全か無かだから**。上表の 2 例はどちらも
 *   「1 つも描画されない」形で出る。ピクセルを比べ始めると誤検知の管理コストのほうが
 *   大きくなり、結局オフにされる。
 */
import {
	findChromium,
	frontendRequire,
	listStories,
	openStorybook,
} from "./harness.mjs";

function parseArgs(argv) {
	const opts = { url: null, filter: null, concurrency: 4 };
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === "--url") opts.url = argv[++i];
		else if (a === "--filter") opts.filter = argv[++i];
		else if (a === "--concurrency") opts.concurrency = Number(argv[++i]);
		else if (a === "-h" || a === "--help") {
			console.log(
				"usage: storybook-smoke [--url <url>] [--filter <title prefix>] [--concurrency <n>]",
			);
			process.exit(0);
		} else {
			console.error(`unknown option: ${a}`);
			process.exit(2);
		}
	}
	if (!Number.isInteger(opts.concurrency) || opts.concurrency < 1) {
		console.error("--concurrency は 1 以上の整数で指定してください");
		process.exit(2);
	}
	return opts;
}

/**
 * 1 ストーリーを開いて結果を返す。
 *
 * ページエラーのうち、**描画に関係しないもの**は落とさない。ここで拾いたいのは
 * 「ストーリーが出ない」ことであって、story 内の fetch 失敗などではない。
 */
async function checkStory(context, baseUrl, story) {
	const page = await context.newPage();
	const errors = [];
	page.on("pageerror", (e) => errors.push(String(e).split("\n")[0]));

	try {
		await page.goto(`${baseUrl}/iframe.html?id=${story.id}&viewMode=story`, {
			waitUntil: "networkidle",
			timeout: 30_000,
		});
		// Storybook は描画完了を DOM に出さないので、レンダリング 1 巡ぶん待つ
		await page.waitForTimeout(150);

		const empty = await page.evaluate(() => {
			const root = document.querySelector("#storybook-root");
			return !root || root.children.length === 0;
		});

		return { story, empty, errors };
	} catch (error) {
		return {
			story,
			empty: true,
			errors: [...errors, String(error).split("\n")[0]],
		};
	} finally {
		await page.close();
	}
}

async function main() {
	const opts = parseArgs(process.argv.slice(2));

	let stories = listStories();
	if (opts.filter) {
		stories = stories.filter((s) => s.title.startsWith(opts.filter));
		if (stories.length === 0) {
			console.error(
				`--filter "${opts.filter}" に一致するストーリーがありません`,
			);
			process.exit(2);
		}
	}

	const { baseUrl, server } = await openStorybook(opts.url);
	const { chromium } = frontendRequire("playwright-core");
	const browser = await chromium.launch({
		executablePath: findChromium(),
		args: ["--no-sandbox"],
	});
	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
	});

	const failures = [];
	try {
		// 直列だと数百ストーリーで数分かかるので、ページだけ並列にする
		// （ブラウザとコンテキストは 1 つで足りる）。
		const queue = [...stories];
		const workers = Array.from(
			{ length: Math.min(opts.concurrency, queue.length) },
			async () => {
				for (let next = queue.shift(); next; next = queue.shift()) {
					const result = await checkStory(context, baseUrl, next);
					if (result.empty || result.errors.length > 0) failures.push(result);
				}
			},
		);
		await Promise.all(workers);
	} finally {
		await browser.close();
		server?.close();
	}

	if (failures.length > 0) {
		// タイトル順に並べて、どの領域が壊れているかを読み取れるようにする
		failures.sort((a, b) => a.story.title.localeCompare(b.story.title));
		console.error(
			`\n❌ ${failures.length} / ${stories.length} 件のストーリーが描画されませんでした\n`,
		);
		for (const { story, empty, errors } of failures) {
			console.error(`  ${story.title} / ${story.name}`);
			if (empty)
				console.error(
					"    → #storybook-root が空（デコレータ / プロバイダ不足の可能性）",
				);
			for (const e of errors) console.error(`    → ${e}`);
		}
		console.error(
			"\n症状別の原因は .claude/skills/storybook/SKILL.md の「ハマりどころ早見表」を参照。",
		);
		process.exit(1);
	}

	console.log(`✅ ${stories.length} 件のストーリーがすべて描画されました`);
}

await main();
