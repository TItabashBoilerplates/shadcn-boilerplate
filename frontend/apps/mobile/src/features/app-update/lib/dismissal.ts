import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * 推奨アップデートの「後で」を覚える。
 *
 * **端末ローカルの利便性のための状態**なので AsyncStorage でよい（サーバに持たない）。
 * 消えても「もう一度案内が出る」だけで実害が無い。逆に**強制アップデートの状態は
 * ここに置かない** — 端末側で消せる値でブロックを解けてしまう。
 *
 * 保存するのは**見送った版そのもの**（真偽値でも日時でもない）。
 * 版を持てば「さらに新しい版が出たら自動でまた出る」が自然に成立する。
 */
const DISMISSED_VERSION_KEY = 'app-update:dismissed-version'

export async function readDismissedVersion(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(DISMISSED_VERSION_KEY)
  } catch (error: unknown) {
    // 読めないなら「見送っていない」= 案内を出す、が安全側
    console.warn('Failed to read dismissed app version:', { error })
    return null
  }
}

export async function writeDismissedVersion(version: string): Promise<void> {
  try {
    await AsyncStorage.setItem(DISMISSED_VERSION_KEY, version)
  } catch (error: unknown) {
    // 書けなくても案内が再表示されるだけ。UI を失敗させない
    console.warn('Failed to persist dismissed app version:', { version, error })
  }
}
