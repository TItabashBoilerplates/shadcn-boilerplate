// gluestack 公式 MCP サーバ（github.com/gluestack/mcp）は起動バナーを console.log で
// stdout に出す。stdio transport では stdout が JSON-RPC 専用チャネルなので、これは
// プロトコルを厳密にパースするクライアントでハンドシェイクを壊しうる。
//
// console.log だけを stderr に振り替える。MCP SDK の StdioServerTransport は
// process.stdout.write を直接呼ぶため、JSON-RPC の送信には影響しない。
//
// 上流を書き換えず（cache は再生成されうる）起動時に注入するだけに留めている。
console.log = (...args) => {
	console.error(...args);
};
