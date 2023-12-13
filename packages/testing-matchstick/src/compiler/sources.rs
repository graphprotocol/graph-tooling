use clap::ArgMatches;
use regex::{Regex, RegexSet};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

use crate::logging;

/// Collects all tests sources from the current TESTS_LOCATION
/// Filters the sources if suite name[s] are passed to the `matchstick` command
pub fn get_test_sources(matches: &ArgMatches) -> HashMap<String, PathBuf> {
    let mut testable: HashMap<String, PathBuf> = HashMap::new();

    crate::TESTS_LOCATION.with(|path| {
        let tests_path = &*path.borrow();
        testable = collect_files(tests_path);

        if testable.is_empty() {
            logging::critical!("No tests have been written yet.");
        }

        if let Some(values) = matches.values_of("test_suites") {
            let patterns: Vec<&str> = values.collect::<Vec<&str>>();
            let formatted: HashSet<String> = patterns
                .iter()
                .map(|pattern| {
                    let full_path = tests_path.join(pattern);
                    format!("^{}", full_path.to_str().unwrap()).to_ascii_lowercase()
                })
                .collect();

            let patterns_set = RegexSet::new(&formatted).unwrap();
            testable = testable
                .clone()
                .into_iter()
                .filter(|test| {
                    patterns_set.is_match(&test.1.to_str().unwrap().to_ascii_lowercase())
                })
                .collect();

            if testable.is_empty() {
                logging::critical!("No tests match set patterns: {}", patterns.join(","));
            }
        }
    });
    testable
}

/// Collects all tests sources from the current TESTS_LOCATION
fn collect_files(path: &Path) -> HashMap<String, PathBuf> {
    let mut files: HashMap<String, PathBuf> = HashMap::new();

    let entries = path
        .read_dir()
        .unwrap_or_else(|err| logging::critical!("Could not get tests from {:?}: {}", path, err));

    for entry in entries {
        let entry = entry.unwrap_or_else(|err| logging::critical!(err));
        let name = entry.file_name().to_str().unwrap().to_ascii_lowercase();

        if name.ends_with(".test.ts") {
            files.insert(name.replace(".test.ts", ""), entry.path());
        } else if entry.path().is_dir() {
            let mut sub_files = collect_files(&entry.path());

            if !sub_files.is_empty() {
                for (key, val) in sub_files.iter_mut() {
                    files.insert(
                        format!("{}/{}", name.clone(), key.clone()),
                        val.to_path_buf(),
                    );
                }
            }
        }
    }

    files
}

/// Checks if any test files or imported files (except node_modules) have been modified
/// since the last time the wasm files have been compiled
pub fn is_source_modified(in_file: &Path, out_file: &Path) -> bool {
    let wasm_modified = fs::metadata(out_file)
        .unwrap_or_else(|err| {
            logging::critical!(
                "Failed to extract metadata from {:?} with error: {}",
                out_file,
                err
            )
        })
        .modified()
        .unwrap();

    let in_file_modified = fs::metadata(in_file)
        .unwrap_or_else(|err| {
            logging::critical!(
                "Failed to extract metadata from {:?} with error: {}",
                in_file,
                err
            )
        })
        .modified()
        .unwrap();

    if in_file_modified > wasm_modified {
        return true;
    }

    are_imports_modified(in_file, wasm_modified)
}

/// Checks if any imported files (except node_modules) have been modified
/// since the last time the wasm files have been compiled
fn are_imports_modified(in_file: &Path, wasm_modified: SystemTime) -> bool {
    let mut is_modified = false;
    let mut matches: HashSet<PathBuf> = HashSet::new();

    get_imports_from_file(in_file, &mut matches);

    for m in matches {
        let import_modified = fs::metadata(&m)
            .unwrap_or_else(|err| {
                logging::critical!(
                    "Failed to extract metadata from {:?} with error: {}",
                    m,
                    err
                )
            })
            .modified()
            .unwrap();

        if import_modified > wasm_modified {
            is_modified = true;
            break;
        }
    }

    is_modified
}

/// Returns the Result of #canonicalize
/// First tries to get the absolute path of the passed Path as a dir
/// If it returns an Error, tries again as a .ts file
fn get_import_absolute_path(
    in_file: &Path,
    imported_file: &Path,
) -> Result<PathBuf, std::io::Error> {
    let mut combined_path = PathBuf::from(in_file);
    combined_path.pop();
    combined_path.push(imported_file);
    if let Ok(abs_path) = combined_path.canonicalize() {
        Ok(abs_path)
    } else {
        combined_path.set_extension("ts");
        combined_path.canonicalize()
    }
}

/// Collects all imported file paths (except node_modules) from a test.ts file using regex
/// Returns a HashSet of the absolute paths of each import.
/// Ignores the files that dont have .ts extension.
fn get_imports_from_file(in_file: &Path, imports: &mut HashSet<PathBuf>) {
    // Regex should match the file path of each import statement except for node_modules
    // e.g. should return `../generated/schema` from `import { Gravatar } from '../generated/schema'`
    // but it will ignore node_modules, e.g. `import { test, log } from 'matchstick-as/assembly/index'`
    // Handles single and double quotes
    let imports_regex = Regex::new(r#"[import.*from]\s*["|']\s*([../+|./].*)\s*["|']"#).unwrap();
    let file_as_str = fs::read_to_string(in_file).unwrap_or_else(|err| {
        logging::critical!("Failed to read {:?} with error: {}", in_file, err)
    });

    for import in imports_regex.captures_iter(&file_as_str) {
        if let Ok(path) = get_import_absolute_path(in_file, &PathBuf::from(import[1].to_owned())) {
            handle_import(in_file, &path, imports)
        }
    }
}

fn handle_import(in_file: &Path, import: &Path, imports: &mut HashSet<PathBuf>) {
    if import.is_dir() {
        for entry in import
            .read_dir()
            .unwrap_or_else(|_| panic!("Could not read dir: {import:?}"))
        {
            handle_import(in_file, &entry.unwrap().path(), imports)
        }
    } else if let Ok(abs_path) = get_import_absolute_path(in_file, import) {
        if !imports.contains(&abs_path) {
            imports.insert(abs_path.clone());
            get_imports_from_file(&abs_path, imports);
        }
    }
}

#[cfg(test)]
mod compiler_tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;

    #[test]
    fn it_gets_project_imports_test() {
        let in_file = PathBuf::from("mocks/as/mock-includes.test.ts");
        let mut includes: HashSet<PathBuf> = HashSet::new();
        get_imports_from_file(&in_file, &mut includes);
        let root_path = fs::canonicalize("./").expect("Something went wrong!");
        let root_path_str = root_path.to_str().unwrap();

        assert_eq!(
            includes,
            HashSet::from([
                PathBuf::from(format!("{root_path_str}/mocks/as/utils.ts")),
                PathBuf::from(format!("{root_path_str}/mocks/generated/schema.ts")),
                PathBuf::from(format!("{root_path_str}/mocks/src/gravity.ts"))
            ])
        )
    }

    #[test]
    fn it_get_absolute_path_of_imports_test() {
        let in_file = PathBuf::from("mocks/as/mock-includes.test.ts");
        let root_path = fs::canonicalize("./").expect("Something went wrong!");

        let result = get_import_absolute_path(&in_file, Path::new("./utils"));
        let abs_path = PathBuf::from(format!("{}/mocks/as/utils.ts", root_path.to_str().unwrap()));

        assert_eq!(result.unwrap(), abs_path);
    }
}
