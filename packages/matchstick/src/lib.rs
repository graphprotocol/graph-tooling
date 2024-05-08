#![deny(clippy::all)]

#[macro_use]
extern crate napi_derive;
extern crate colored;
extern crate graph;

use graph::prelude::chrono::prelude::*;
use graph_chain_ethereum::Chain;
use napi::{Env, JsObject, JsUndefined, Result as NapiResult};
use std::cell::RefCell;
use std::collections::HashMap;
use std::path::PathBuf;

mod cli;
mod compiler;
mod config;
mod context;
mod coverage;
mod instance;
mod logging;
mod parser;
mod subgraph_store;
mod test_suite;
mod unit_tests;
mod writable_store;

thread_local! {
    static MANIFEST_LOCATION: RefCell<PathBuf> = RefCell::new(PathBuf::new());
    static SCHEMA_LOCATION: RefCell<PathBuf> = RefCell::new(PathBuf::new());
    static TESTS_LOCATION: RefCell<PathBuf> = RefCell::new(PathBuf::new());
    static LIBS_LOCATION: RefCell<PathBuf> = RefCell::new(PathBuf::new());
}

#[napi]
pub fn execute_matchstick(env: Env, _args: JsUndefined) -> NapiResult<JsObject> {
  let now = Instant::now();

  print_logo();

  let config = MatchstickConfig::from("matchstick.yaml");

  MANIFEST_LOCATION.with(|path| *path.borrow_mut() = PathBuf::from(&config.manifest_path));
  SCHEMA_LOCATION.with(|path| {
    let manifest_schema = parser::get_schema_location(&config.manifest_path);
    let mut schema_location = PathBuf::from(&config.manifest_path);
    schema_location.pop();
    schema_location.push(&manifest_schema);
    *path.borrow_mut() = schema_location
      .canonicalize()
      .unwrap_or_else(|_| panic!("Could not find schema at `{}`", manifest_schema));
  });
  TESTS_LOCATION.with(|path| *path.borrow_mut() = PathBuf::from(&config.tests_path));
  LIBS_LOCATION.with(|path| *path.borrow_mut() = PathBuf::from(&config.libs_path));

  logging::log_with_style!("Compiling...\n", "bright_green");

  let compiler = Compiler::new(PathBuf::from(config.libs_path))
    .export_table()
    .runtime("stub")
    .optimize()
    .debug();

  let outputs = compiler.execute();

  let ms_instances: HashMap<String, MatchstickInstance<Chain>> = outputs
    .into_iter()
    .map(|(key, val)| {
      (
        key,
        MatchstickInstance::<Chain>::new(val.file.to_str().unwrap()),
      )
    })
    .collect();

  let test_suites: HashMap<String, TestGroup> = ms_instances
    .iter()
    .map(|(key, val)| (key.clone(), TestGroup::from(val)))
    .collect();

  let exit_code = run_test_suites(test_suites);

  logging::default!(format!(
    "\n[{}] Program executed in: {:.3?}.",
    Local::now().to_rfc2822(),
    now.elapsed()
  ));

  let result = env.create_object()?;
  result.set_named_property("exitCode", env.create_int32(exit_code)?)?;

  Ok(result)
}

fn print_logo() {
  logging::log_with_style!(
    r#"
___  ___      _       _         _   _      _
|  \/  |     | |     | |       | | (_)    | |
| .  . | __ _| |_ ___| |__  ___| |_ _  ___| | __
| |\/| |/ _` | __/ __| '_ \/ __| __| |/ __| |/ /
| |  | | (_| | || (__| | | \__ \ |_| | (__|   <
\_|  |_/\__,_|\__\___|_| |_|___/\__|_|\___|_|\_\
    "#,
    "bright_red"
  );
}

fn run_test_suites(test_suites: HashMap<String, TestGroup>) -> i32 {
  logging::log_with_style!("Igniting tests 🔥", "bright_red");

  let (mut num_passed, mut num_failed) = (0, 0);
  let failed_suites: HashMap<String, Vec<HashMap<String, TestResult>>> = test_suites
    .into_iter()
    .filter_map(|(name, suite)| {
      logging::log_with_style!(format!("\n{}", name), "bright_blue");

      Test::call_hooks(&suite.before_all);

      let failed_tests: Vec<HashMap<String, TestResult>> = suite
        .testables
        .into_iter()
        .filter_map(|group| {
          let failed_test = run_testable(&group, &mut num_passed, &mut num_failed);

          if failed_test.is_empty() {
            None
          } else {
            Some(failed_test)
          }
        })
        .collect();

      Test::call_hooks(&suite.after_all);

      if failed_tests.is_empty() {
        None
      } else {
        Some((name, failed_tests))
      }
    })
    .collect();

  if num_failed > 0 {
    let failed = format!("{} failed", num_failed);
    let passed = format!("{} passed", num_passed);
    let total = format!("{} total", num_failed + num_passed);

    logging::log_with_style!("\nFailed tests:\n", "red");

    for (suite, group) in failed_suites {
      logging::log_with_style!(format!("{}", suite), "bright_blue", "bold");

      for tests in group {
        for (name, result) in tests {
          logging::log_with_style!(format!("{}", name), "red", "bold");

          if !result.logs.is_empty() {
            logging::default!(result.logs);
          }
        }
      }
    }

    logging::default!(format!("{}, {}, {}", failed, passed, total));
    1
  } else {
    logging::log_with_style!(format!("\nAll {} tests passed! 😎", num_passed), "green");
    0
  }
}

fn run_testable(
  testable: &Testable,
  num_passed: &mut Box<i32>,
  num_failed: &mut Box<i32>,
) -> HashMap<String, TestResult> {
  let mut failed_tests: HashMap<String, TestResult> = HashMap::new();

  match testable {
    Testable::Test(test) => {
      let result = test.run();
      if result.passed {
        let num = &mut (**num_passed);
        *num += 1;
      } else {
        let num = &mut (**num_failed);
        *num += 1;
        failed_tests.insert(test.name.clone(), result);
      }
    }
    Testable::Group(group) => {
      if !group.name.is_empty() {
        logging::log_with_style!(cyan, bold, italic, "{}:", group.name);
      }

      logging::add_indent();

      Test::call_hooks(&group.before_all);

      for test in &group.testables {
        let failed = run_testable(test, num_passed, num_failed);
        failed_tests.extend(failed);
      }

      Test::call_hooks(&group.after_all);
      logging::sub_indent();
    }
  }

  failed_tests
}
