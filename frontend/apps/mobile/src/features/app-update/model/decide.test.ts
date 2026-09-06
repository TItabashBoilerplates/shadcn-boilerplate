/**
 * 「いまの版で、どう振る舞うべきか」の判断。
 *
 * ここが本体である理由: ストアを開くのも画面を出すのも簡単で、難しいのは
 * **どういうときにユーザーの操作を奪ってよいか**の判断のほう。誤ると
 * **正常なユーザーがアプリを起動できなくなり、こちらから復旧させる手段が無い**
 * （アプリを開けないので、アプリ内で何かを直させることができない）。
 *
 * したがってこの関数の設計原則は 1 つ:
 *
 *   **判断できない材料が 1 つでもあれば、ブロックしない（フェイルオープン）。**
 *
 * 実装: ./decide.ts / 運用: docs/mobile/app-update-runbook.md
 */
import { describe, expect, it } from 'vitest'
import { decideUpdateAction } from './decide'
import type { ReleasePolicy } from './types'

const policy = (over: Partial<ReleasePolicy> = {}): ReleasePolicy => ({
  platform: 'ios',
  minimumVersion: '1.0.0',
  latestVersion: '1.2.0',
  storeUrl: 'https://apps.apple.com/app/id123456789',
  releaseNotes: null,
  ...over,
})

describe('decideUpdateAction（アップデートの要否判断）', () => {
  it('最新版なら何も出さない', () => {
    const d = decideUpdateAction({ currentVersion: '1.2.0', policy: policy() })
    expect(d.action).toBe('none')
    expect(d.reason).toBe('up-to-date')
  })

  it('最新より新しい版（社内ビルド / 審査中の版）でも何も出さない', () => {
    // 審査中の版は「ストアの最新」より新しい。ここで推奨アップデートを出すと
    // 審査担当者に「更新してください」と表示されることになる。
    const d = decideUpdateAction({ currentVersion: '1.3.0', policy: policy() })
    expect(d.action).toBe('none')
  })

  it('下限以上・最新未満なら推奨（後で閉じられる）', () => {
    const d = decideUpdateAction({ currentVersion: '1.1.0', policy: policy() })
    expect(d.action).toBe('recommended')
    expect(d.reason).toBe('below-latest')
  })

  it('下限未満なら強制', () => {
    const d = decideUpdateAction({
      currentVersion: '0.9.0',
      policy: policy({ minimumVersion: '1.0.0' }),
    })
    expect(d.action).toBe('forced')
    expect(d.reason).toBe('below-minimum')
  })

  it('下限ちょうどは強制しない（"minimum 未満" が条件）', () => {
    const d = decideUpdateAction({
      currentVersion: '1.0.0',
      policy: policy({ minimumVersion: '1.0.0' }),
    })
    expect(d.action).not.toBe('forced')
  })

  // ── フェイルオープン ────────────────────────────────────────────────
  describe('材料が欠けたらブロックしない', () => {
    it('方針を取得できていない（通信断・RLS 変更・行が無い）なら none', () => {
      const d = decideUpdateAction({ currentVersion: '0.1.0', policy: null })
      expect(d.action).toBe('none')
      expect(d.reason).toBe('no-policy')
    })

    it('自分の版が読めないなら none', () => {
      const d = decideUpdateAction({ currentVersion: null, policy: policy() })
      expect(d.action).toBe('none')
      expect(d.reason).toBe('unparsable-current-version')
    })

    it('方針側の版が読めないなら none', () => {
      const d = decideUpdateAction({
        currentVersion: '1.0.0',
        policy: policy({ minimumVersion: 'latest' }),
      })
      expect(d.action).toBe('none')
      expect(d.reason).toBe('unparsable-policy-version')
    })

    // DB の CHECK 制約で防いでいるが、制約を落とした / 別経路で入った場合の保険。
    // ストアに無い版を要求することになるので、**強制には決して昇格させない**。
    it('minimum > latest（ストアに存在しない版の要求）は強制にしない', () => {
      const d = decideUpdateAction({
        currentVersion: '1.0.0',
        policy: policy({ minimumVersion: '2.0.0', latestVersion: '1.2.0' }),
      })
      expect(d.action).not.toBe('forced')
      expect(d.reason).toBe('minimum-above-latest')
    })

    it('storeUrl が https でないなら誘導先が無いので none', () => {
      const d = decideUpdateAction({
        currentVersion: '0.9.0',
        policy: policy({ storeUrl: 'javascript:alert(1)' }),
      })
      expect(d.action).toBe('none')
      expect(d.reason).toBe('invalid-store-url')
    })
  })

  // ── 「後で」の記憶 ─────────────────────────────────────────────────
  describe('推奨アップデートの見送り', () => {
    it('その版を見送り済みなら再表示しない', () => {
      const d = decideUpdateAction({
        currentVersion: '1.1.0',
        policy: policy(),
        dismissedVersion: '1.2.0',
      })
      expect(d.action).toBe('none')
      expect(d.reason).toBe('dismissed')
    })

    it('さらに新しい版が出たら再表示する', () => {
      const d = decideUpdateAction({
        currentVersion: '1.1.0',
        policy: policy({ latestVersion: '1.3.0' }),
        dismissedVersion: '1.2.0',
      })
      expect(d.action).toBe('recommended')
    })

    it('強制は見送れない（見送り済みでも強制のまま）', () => {
      const d = decideUpdateAction({
        currentVersion: '0.9.0',
        policy: policy(),
        dismissedVersion: '1.2.0',
      })
      expect(d.action).toBe('forced')
    })
  })

  it('判断結果には誘導先と対象版が含まれる（UI がここだけ見れば描ける）', () => {
    const d = decideUpdateAction({ currentVersion: '1.1.0', policy: policy() })
    expect(d).toMatchObject({
      action: 'recommended',
      latestVersion: '1.2.0',
      storeUrl: 'https://apps.apple.com/app/id123456789',
    })
  })
})
