/// フロントエンドから呼ばれるコマンド。
///
/// プラットフォーム名だけのために JS 側へ `@tauri-apps/plugin-os` を足さず、
/// Rust の標準定数を返す（依存を増やさない）。
#[tauri::command]
fn platform_label() -> String {
    std::env::consts::OS.to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // 自動更新: 確認・署名検証・インストールは plugin が行い、UI は renderer 側
        // （src/features/app-update）。endpoint と公開鍵は tauri.conf.json の plugins.updater。
        // 更新後の再起動（macOS で必要）は process plugin の relaunch。
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![platform_label])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
