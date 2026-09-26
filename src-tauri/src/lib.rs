use tauri::Manager;

mod engine;
mod game;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(desktop)]
            {
                let _ = app.handle().plugin(
                    tauri_plugin_updater::Builder::new().build(),
                );
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            engine::init_engine,
            engine::analyze,
            engine::stop,
            engine::shutdown,
            game::new_game,
            game::make_move,
            game::get_fen,
            game::get_moves,
            game::undo_move,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
