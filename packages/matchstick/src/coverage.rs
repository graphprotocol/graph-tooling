use colored::Colorize;
use regex::Regex;
use run_script::{run_or_exit, ScriptOptions};
use std::fs;
use std::path::{Path, PathBuf};

use crate::logging;
use crate::parser;

pub fn generate_coverage_report() {
    crate::MANIFEST_LOCATION.with(|path| {
        logging::log_with_style!(cyan, "\nRunning in coverage report mode.\n️");

        let wat_files = generate_wat_files();

        logging::log_with_style!(cyan, "Generating coverage report 📝\n");

        let mut global_handlers_count: i32 = 0;
        let mut global_handlers_called: i32 = 0;

        let source_handlers =
            parser::collect_handlers(path.borrow().to_str().expect("Cannot convert to string."));

        for (name, handlers) in source_handlers.into_iter() {
            logging::default!("Handlers for source '{}':", name);

            let mut called: i32 = 0;
            let all_handlers: i32 = handlers.len().try_into().unwrap();

            // Iterates over every handler and checks if the handler has been called in any test suite
            // If called, it'll set `is_tested` to true and break out of the loop
            // called will be incremented by 1
            for handler in handlers {
                let mut is_tested = false;

                for wat_file in &wat_files {
                    let wat_content = fs::read_to_string(wat_file)
                        .unwrap_or_else(|_| logging::critical!("Couldn't read wat file."));

                    if is_called(&wat_content, &handler) {
                        is_tested = true;
                        break;
                    }
                }

                if is_tested {
                    called += 1;

                    logging::log_with_style!(green, "Handler '{}' is tested.", handler);
                } else {
                    logging::log_with_style!(red, "Handler '{}' is not tested.", handler);
                }
            }

            let mut percentage: f32 = 0.0;

            if all_handlers > 0 {
                percentage = (called as f32 * 100.0) / all_handlers as f32;
            }

            logging::default!(
                "Test coverage: {:.1}% ({}/{} handlers).\n",
                percentage,
                called,
                all_handlers
            );

            global_handlers_count += all_handlers;
            global_handlers_called += called;
        }

        let mut percentage: f32 = 0.0;

        if global_handlers_count > 0 {
            percentage = (global_handlers_called as f32 * 100.0) / global_handlers_count as f32;
        }

        logging::default!(
            "Global test coverage: {:.1}% ({}/{} handlers).\n",
            percentage,
            global_handlers_called,
            global_handlers_count
        );
    });
}

fn is_called(wat_content: &str, handler: &str) -> bool {
    let pattern = format!(r#"call.+{handler}"#);
    let regex = Regex::new(&pattern).expect("Not a valid regex pattern.");

    regex.is_match(wat_content)
}

fn collect_wasm_files(path: &Path) -> Vec<PathBuf> {
    let mut files: Vec<PathBuf> = Vec::new();

    let entries = path.read_dir().unwrap_or_else(|err| {
        logging::critical!("Could not get wasm files from {:?}: {}", path, err)
    });

    for entry in entries {
        let entry = entry.unwrap_or_else(|err| logging::critical!(err));
        let name = entry.file_name().to_str().unwrap().to_ascii_lowercase();

        if name.ends_with(".wasm") {
            files.push(entry.path());
        } else if entry.path().is_dir() {
            let mut sub_files = collect_wasm_files(&entry.path());

            if !sub_files.is_empty() {
                for file in sub_files.iter_mut() {
                    files.push(file.to_path_buf());
                }
            }
        }
    }

    files
}

/// Converts each wasm file to wat
/// Returns a collection of all .wat files paths
fn generate_wat_files() -> Vec<String> {
    let mut wasm_files: Vec<PathBuf> = vec![];

    crate::TESTS_LOCATION.with(|path| {
        let bin_location = path.borrow().join(".bin");
        wasm_files = collect_wasm_files(&bin_location);
    });

    wasm_files
        .iter()
        .map(|file| {
            let destination = file.with_extension("wat");

            crate::LIBS_LOCATION.with(|path| {
                let convert_command = format!(
                    "{:?} {:?} {} {:?}",
                    path.borrow().join("wabt/bin/wasm2wat"),
                    file,
                    "-o",
                    destination
                );

                let options = ScriptOptions::new();
                let args = vec![];

                run_or_exit(&convert_command, &args, &options);
            });

            destination.to_str().unwrap().to_owned()
        })
        .collect()
}
