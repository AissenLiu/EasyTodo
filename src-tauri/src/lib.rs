use std::sync::Mutex;
#[cfg(not(debug_assertions))]
use tauri::Manager;
use tauri::{WebviewUrl, WebviewWindowBuilder};

// 全局持有 Node.js 子进程句柄
static SERVER_PROCESS: Mutex<Option<std::process::Child>> = Mutex::new(None);

/// 轮询等待服务器端口就绪
#[cfg(not(debug_assertions))]
fn wait_for_server(port: u16, max_attempts: u32) -> bool {
    for _ in 0..max_attempts {
        if std::net::TcpStream::connect(format!("127.0.0.1:{}", port)).is_ok() {
            return true;
        }
        std::thread::sleep(std::time::Duration::from_millis(500));
    }
    false
}

/// 启动 Next.js Node.js 子进程
/// Windows 下使用 CREATE_NO_WINDOW 标志隐藏控制台窗口
#[cfg(not(debug_assertions))]
fn spawn_node_server(server_js: &std::path::Path, port: u16, db_path: &str) -> Option<std::process::Child> {
    let server_dir = server_js.parent().unwrap_or(std::path::Path::new("."));

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("node.exe")
            .arg(server_js)
            .env("PORT", port.to_string())
            .env("HOSTNAME", "127.0.0.1")
            .env("DATABASE_PATH", db_path)
            .current_dir(server_dir)
            .creation_flags(0x08000000) // CREATE_NO_WINDOW：不弹出黑色控制台
            .spawn()
            .map_err(|e| eprintln!("启动 Node.js 失败: {}，请确认 node 已加入系统 PATH", e))
            .ok()
    }

    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new("node")
            .arg(server_js)
            .env("PORT", port.to_string())
            .env("HOSTNAME", "127.0.0.1")
            .env("DATABASE_PATH", db_path)
            .current_dir(server_dir)
            .spawn()
            .map_err(|e| eprintln!("启动 Node.js 失败: {}", e))
            .ok()
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 开发模式用 3000，生产用 38749（避免与 Next.js dev 端口冲突）
    let port: u16 = if cfg!(debug_assertions) { 3000 } else { 38749 };

    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(move |app| {
            // ── 生产模式：启动内嵌 Next.js 服务器 ─────────────────────────
            #[cfg(not(debug_assertions))]
            {
                // 数据库存储路径（AppData\Roaming\极简待办\ on Windows）
                let data_dir = app.path().app_data_dir()?;
                std::fs::create_dir_all(&data_dir).ok();
                let db_path = data_dir.join("database.sqlite");
                let db_path_str = db_path.to_string_lossy().to_string();

                // server.js 路径：exe 同级目录下的 server/server.js
                let exe_dir = std::env::current_exe()
                    .expect("无法获取 exe 路径")
                    .parent()
                    .expect("无法获取 exe 目录")
                    .to_path_buf();
                let server_js = exe_dir.join("server").join("server.js");

                if let Some(child) = spawn_node_server(&server_js, port, &db_path_str) {
                    *SERVER_PROCESS.lock().unwrap() = Some(child);
                    // 等待服务器就绪，最多 15 秒
                    if !wait_for_server(port, 30) {
                        eprintln!("警告：Next.js 服务器未在预期时间内就绪，继续尝试加载...");
                    }
                }
            }

            // ── 开发模式：直接连接已运行的 Next.js dev server ─────────────
            #[cfg(debug_assertions)]
            {
                // dev 模式不启动子进程，假定 `npm run dev` 已在 3000 端口运行
                let _ = app; // 避免 unused 警告
            }

            // ── 创建主窗口 ─────────────────────────────────────────────────
            let url = format!("http://127.0.0.1:{}", port);
            let window_builder = WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::External(url.parse().expect("无效的 URL")),
            );

            #[cfg(target_os = "windows")]
            let window_builder = window_builder.disable_drag_drop_handler();

            #[cfg(not(target_os = "windows"))]
            let window_builder = window_builder;

            window_builder
                .title("极简待办")
                .inner_size(1200.0, 860.0)
                .min_inner_size(900.0, 600.0)
                .center()
                .build()?;

            Ok(())
        })
        // 窗口销毁时 kill 掉 Node.js 子进程
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if let Ok(mut guard) = SERVER_PROCESS.lock() {
                    if let Some(mut child) = guard.take() {
                        let _ = child.kill();
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("Tauri 运行出错");
}
