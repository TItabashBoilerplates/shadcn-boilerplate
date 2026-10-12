# LLM エージェントの制御ポリシー（正規表現・文字列パースで LLM の判断を代替しない）

**CRITICAL / NON-NEGOTIABLE**: **LLM を使うエージェント / 機能の制御フロー（分岐・ループの継続と終了・
ツール選択・意図の判定・出力の取り出し）を、正規表現や文字列パースで実装してはならない。**

- **意味の判断は LLM にさせる。** 「この問い合わせは返金か」「もう十分な情報が集まったか」「次に何をするか」
  を `if "返金" in text` や `re.search(...)` で決めた時点で、**その部分に LLM を使う意味は無くなる**。
  キーワード照合で判断できるなら最初から LLM は要らないし、判断できないから LLM を使っているはずである。
- **LLM の出力は構造で受け取る。** 自由文を正規表現で切り出すのではなく、
  **Structured Output（スキーマ付き出力）/ Tool Calling（関数呼び出し）**で型付きの値として受け取る。
- **ループの継続・終了は、モデルが返す構造（ツール呼び出しの有無・スキーマのフィールド）とグラフの遷移で決める。**
  出力文字列に `"FINAL ANSWER"` が含まれるかどうかで止めない。

> これは「正規表現を使うな」という一般論ではない。**禁止しているのは、LLM が担うべき判断や、LLM の出力の解釈を
> 文字列処理で肩代わりすること**。LLM と無関係な入力（ユーザーが入力したメールアドレスの形式検証など）に
> 正規表現を使うのは従来どおりでよい（§3）。

---

## 0. なぜ禁止するか

| 問題 | 何が起きるか |
|---|---|
| **LLM を使う意味が消える** | キーワード・パターンで分岐するなら、それはルールベースのプログラムである。言い換え・表記揺れ・否定（「返金は不要です」）・多言語・文脈を扱えるという LLM の唯一の価値を、自分で捨てている |
| **無言で壊れる** | モデルの言い回しはバージョン・温度・プロンプトの微修正で変わる。昨日 `Action: search` と書いていたモデルが今日 `**Action**: search` と書けば、正規表現は一致せず、エラーにもならずに別の分岐へ流れる |
| **終わらないループ / 早すぎる終了** | 終了判定の文字列が出ないとループが上限まで回り続け（トークン費用がそのまま請求になる）、逆に途中の文中にその語が出ると処理が途中で打ち切られる |
| **プロンプトインジェクションの入口になる** | ユーザー入力やツール結果（Web ページ・メール本文）に `FINAL ANSWER:` や `Action: delete_all` と書かれていれば、文字列パースはそれをモデルの指示と区別できない |
| **テストで見つからない** | 開発中に試した数パターンでは正規表現が一致するので、テストも動作確認も通る。壊れるのは本番の多様な入力に当たってから |

**公式の推奨の道も構造化出力である。** LangChain v1 は `create_agent(response_format=...)`
（`ToolStrategy` / `ProviderStrategy`）と `model.with_structured_output(...)`、LangGraph はツール呼び出しと
`Command` による遷移を提供している。主要プロバイダ（OpenAI / Anthropic / Gemini）も
JSON Schema に沿った出力とツール呼び出しを API として持っている。テキストを正規表現で読む
ReAct 形式のパーサは、これらが無かった時代の回避策であって、いま選ぶ理由は無い。

---

## 1. やってはいけないこと（禁止パターン）

```python
# ❌ 意図・分類をキーワードで判定する（LLM を使う意味が無い）
if "返金" in user_message or re.search(r"refund|払い戻し", user_message):
    route = "refund"

# ❌ LLM の自由文から値を正規表現で抜き出す
text = llm.invoke(prompt).content
m = re.search(r"```json\s*(\{.*?\})\s*```", text, re.S)
data = json.loads(m.group(1)) if m else {}

# ❌ ReAct 形式のテキストを自前でパースしてツールを選ぶ
action = re.search(r"Action:\s*(\w+)", text).group(1)
action_input = re.search(r"Action Input:\s*(.*)", text).group(1)
result = TOOLS[action](action_input)

# ❌ 出力文字列でループを止める / 続ける
while "FINAL ANSWER" not in text:
    text = llm.invoke(messages).content

# ❌ 判定を自由文で答えさせて文字列比較する
verdict = llm.invoke("十分な情報が集まったら YES と答えて").content
if verdict.strip().upper().startswith("YES"):
    ...

# ❌ 壊れた JSON を正規表現・文字列置換で「修復」する
fixed = re.sub(r",\s*}", "}", text)

# ❌ スコア・ラベル・件数を自由文から数字だけ拾う
score = int(re.findall(r"\d+", llm.invoke("1〜10 で採点して").content)[0])
```

```ts
// ❌ TypeScript でも同じ（Edge Functions / Route Handler で LLM を呼ぶ場合）
const text = (await model.invoke(prompt)).content as string
if (text.includes('ESCALATE')) await escalate()
const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
```

---

## 2. 代わりにどう書くか

### 2.1 判断・分類・抽出は Structured Output で受け取る

```python
from typing import Literal
from pydantic import BaseModel, Field

class Triage(BaseModel):
    intent: Literal["refund", "billing", "bug_report", "other"]
    needs_human: bool = Field(description="人間のオペレーターへの引き継ぎが必要か")
    reason: str = Field(description="判断の根拠（ログと評価に使う）")

triage = llm.with_structured_output(Triage).invoke(messages)
if triage.needs_human:          # ← 分岐の材料は「型付きのフィールド」
    ...
```

- **選択肢は `Literal` / `enum` で閉じる。** 自由文のラベルを後から文字列比較しない。
- **判断の根拠（`reason` など）もフィールドとして返させる。** ログ・評価（LangSmith）・デバッグに使える。
- **数値（スコア・件数・信頼度）も型と範囲付きのフィールド**（`Field(ge=0, le=1)` 等）で受け取る。

### 2.2 次の行動はツール呼び出しで選ばせる

ツールの選択と引数は **モデルの tool call（構造化された呼び出し）**で受け取り、フレームワークに実行させる。
`create_agent` / `create_react_agent` / LangGraph の `ToolNode` を使い、**ツール名や引数を文字列から
組み立てない**（`.claude/skills/langchain/`）。

### 2.3 ループの継続・終了は構造で決める

| 判断 | 決め方 |
|---|---|
| まだツールを使うか / 終わるか | **モデルの応答に tool call があるか**（エージェントの標準ループ） |
| 最終回答の形 | `create_agent(response_format=ToolStrategy(Schema))` 等で**スキーマ付きの最終出力**として受け取る |
| グラフのどのノードへ進むか | ノードが返す **`Command(goto=...)` / 状態のフィールド**による条件付きエッジ。条件は構造化出力の値から決める |
| 人間の承認 | `interrupt()` / `HumanInTheLoopMiddleware`（自由文の「はい」を文字列比較しない） |

### 2.4 コードで決めてよいもの（決定的なガードレール）

LLM に判断させないほうがよいもの、**コードで強制すべきもの**もある。これらは文字列パースではなく
**構造化された状態に対する決定的な判定**として書く。

- **安全上の上限**: 最大ステップ数・最大トークン数・タイムアウト・コスト上限（`ai-usage-metering`）
- **権限**: そのツールをこのユーザーが呼べるか、引数の値が許可範囲か（RLS / JWT から解決した本人か）
- **スキーマ検証**: Pydantic / Zod による型・範囲の検証。**検証に失敗したら修復せず、エラーとして扱う**
  （再試行させるなら、フレームワークの仕組みで「スキーマに沿って答え直させる」。正規表現で直さない）

---

## 3. 適用範囲（何が対象で、何が対象外か）

| 対象（禁止） | 対象外（従来どおり） |
|---|---|
| LLM の出力テキストを正規表現・`split` / `find` / `startswith` / `in` で解釈すること | LLM と無関係な入力の形式検証（メールアドレス・電話番号・URL・日付） |
| LLM に任せるべき意味判断（意図・分類・要否・十分性・感情・優先度）をキーワード照合で代替すること | ユーザーが UI で明示的に選んだ値（ボタン・セレクト・スラッシュコマンドの構造化されたパラメータ） |
| 文字列の有無でエージェントのループ・分岐・ツール選択を決めること | ストリーミング中の表示用テキストの整形（判断や制御に使わないもの） |
| LLM 出力の JSON を文字列処理で修復・抽出すること | プロバイダ SDK / フレームワークが内部で行うパース（tool call・structured output の実装） |

**迷ったら**: 「その文字列処理の結果で、プログラムの進む道が変わるか？」を問う。
**変わるなら、それは LLM の判断を肩代わりしているので禁止**。構造化出力・ツール呼び出しに置き換える。

**どうしても構造化出力が使えない事情**（使っているモデルが tool calling / structured output に対応しない等）が
あるなら、推測で回避策を書かず**ユーザーに確認**する。対応モデルへの切り替えが第一候補である。

---

## 4. テスト・評価

- **ロジック（分岐・状態遷移・ガードレール）は、構造化出力の値を与えて単体テストする**（`.claude/rules/tdd.md`）。
  モデル呼び出しは差し替え可能な 1 か所に閉じる。
- **LLM の判断の質は、出力文字列の正規表現一致ではなく、構造化フィールドに対する評価**で測る
  （LangSmith のデータセット + 評価器。`.claude/skills/langchain/langsmith.md`）。
- 「数パターン試したら正規表現が一致した」は検証にならない。

---

## 5. チェックリスト（LLM を呼ぶコードを書いたら必ず）

| # | 確認 |
|---|---|
| 1 | LLM の出力を `re` / `split` / `find` / `in` / `startswith` / `JSON.parse(text.slice(...))` で解釈していないか |
| 2 | 意図・分類・要否などの意味判断を、キーワード照合で代替していないか |
| 3 | 判断結果は Structured Output（`with_structured_output` / `response_format`）の型付きフィールドで受け取っているか |
| 4 | ツールの選択と引数は tool call で受け取り、フレームワークに実行させているか |
| 5 | ループの継続・終了とグラフの遷移が、構造（tool call の有無・状態のフィールド・`Command`）で決まっているか |
| 6 | 最大ステップ数・コスト上限・権限チェックは決定的なコードで強制しているか |
| 7 | スキーマ検証の失敗を文字列処理で修復していないか（エラーとして扱う / フレームワークで再生成させる） |
| 8 | 使用量の記録（`ai-usage-metering`）がセットになっているか |

---

## 6. 強制事項

このポリシーは**交渉の余地なし**。

- **LLM の出力を正規表現・文字列パースで解釈して制御フローを決める実装は、レビューで却下**する。
- **LLM に任せるべき意味判断をキーワード・正規表現で代替する実装も却下**する。
- 「その方が速い」「その方が確実」は理由にならない。**確実に判断できる処理なら LLM は要らず、
  LLM が要る処理なら文字列パースでは判断できない。**
- 構造化出力が使えない事情がある場合は、推測で回避せず**ユーザーに確認**する。

## 関連

- `.claude/skills/langchain/`（Structured Output・エージェント・LangGraph）/ `langchain-fundamentals` / `langgraph-fundamentals` / `langchain-middleware`
- `.claude/skills/ai-usage-metering/`（LLM を呼ぶコードは使用量の記録とセット）
- `.claude/rules/supabase-first.md`（LLM / エージェント処理は backend-py）/ `.claude/rules/error-handling.md` / `.claude/rules/minimal-implementation.md`（公式の推奨の道に乗る）
