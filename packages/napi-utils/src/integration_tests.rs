#[cfg(test)]
mod tests {
  use graph_chain_ethereum::Chain;
  use serial_test::serial;
  use std::path::PathBuf;
  use std::{env, fs};

  use crate::test_suite::{Test, TestGroup, Testable};
  use crate::{MatchstickInstance, MANIFEST_LOCATION, SCHEMA_LOCATION};

  #[test]
  #[serial]
  fn run_all_gravity_demo_subgraph_tests() {
    let current_dir = env::current_dir().unwrap();
    println!("Current directory: {:?}", current_dir);

    let schema_path = PathBuf::from("./mocks/schema.graphql");
    let manifest_path = PathBuf::from("./mocks/yamls/subgraph.yaml");

    println!("Schema path: {:?}", schema_path);
    println!("Manifest path: {:?}", manifest_path);

    if !schema_path.exists() {
      println!("Schema file does not exist: {:?}", schema_path);
    } else {
      println!("Schema file found: {:?}", schema_path);
    }
    if !manifest_path.exists() {
      println!("Manifest file does not exist: {:?}", manifest_path);
    } else {
      println!("Manifest file found: {:?}", manifest_path);
    }

    // Check file permissions
    let schema_metadata = fs::metadata(&schema_path).expect("Unable to read schema file metadata");
    let manifest_metadata =
      fs::metadata(&manifest_path).expect("Unable to read manifest file metadata");
    println!(
      "Schema file permissions: {:?}",
      schema_metadata.permissions()
    );
    println!(
      "Manifest file permissions: {:?}",
      manifest_metadata.permissions()
    );

    SCHEMA_LOCATION.with(|path| *path.borrow_mut() = schema_path);
    MANIFEST_LOCATION.with(|path| *path.borrow_mut() = manifest_path);

    let module = <MatchstickInstance<Chain>>::new("mocks/wasm/gravity.wasm");
    let test_suite = TestGroup::from(&module);
    let mut failed_tests = Box::new(0);

    Test::call_hooks(&test_suite.before_all);

    for group in &test_suite.testables {
      run_testable(group, &mut failed_tests);
    }

    assert_eq!(failed_tests, Box::new(0));
  }

  #[test]
  #[serial]
  fn run_all_token_lock_wallet_demo_subgraph_tests() {
    SCHEMA_LOCATION.with(|path| *path.borrow_mut() = PathBuf::from("./mocks/schema.graphql"));
    MANIFEST_LOCATION
      .with(|path| *path.borrow_mut() = PathBuf::from("./mocks/yamls/subgraph.yaml"));

    let module = <MatchstickInstance<Chain>>::new("mocks/wasm/token-lock-wallet.wasm");
    let test_suite = TestGroup::from(&module);
    let mut failed_tests = Box::new(0);

    Test::call_hooks(&test_suite.before_all);
    for testable in &test_suite.testables {
      run_testable(testable, &mut failed_tests);
    }

    assert_eq!(failed_tests, Box::new(0));
  }

  fn run_testable(testable: &Testable, num_failed: &mut Box<i32>) {
    match testable {
      Testable::Test(test) => {
        let result = test.run();
        if !result.passed {
          let num = &mut (**num_failed);
          *num += 1;
        }
      }
      Testable::Group(group) => {
        Test::call_hooks(&group.before_all);

        for testable in &group.testables {
          run_testable(testable, num_failed);
        }

        Test::call_hooks(&group.after_all);
      }
    }
  }
}
