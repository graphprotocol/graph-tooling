use colored::Colorize;
use graph::blockchain::Blockchain;
use std::time::Instant;
use wasmtime::Func;

use crate::{instance::MatchstickInstance, logging};

pub struct Test {
    pub name: String,
    should_fail: bool,
    func: Func,
    before_hooks: Vec<Func>,
    after_hooks: Vec<Func>,
}

pub struct TestResult {
    pub passed: bool,
    pub logs: String,
}

// TestGroup replaces the TestSuite struct. A TestGroup represents a group of testables that
// can be either Test or other TestGroups.
pub struct TestGroup {
    pub name: String,
    pub before_all: Vec<Func>,
    pub after_all: Vec<Func>,
    pub testables: Vec<Testable>,
}

// A Testable could be a single Test struct, e.g a test() function, or a TestGroup which in this case
// represents a describe() block containing other describe() blocks or test() functions.
pub enum Testable {
    Test(Test),
    Group(TestGroup),
}

impl Test {
    fn new(name: String, should_fail: bool, func: Func) -> Self {
        Test {
            name,
            should_fail,
            func,
            before_hooks: vec![],
            after_hooks: vec![],
        }
    }

    pub fn call_hooks(hooks: &[Func]) {
        hooks.iter().for_each(|h| {
            h.call(&[]).unwrap_or_else(|err| {
                logging::critical!("Unexpected error upon calling hook: {}", err)
            });
        });
    }

    fn before(&self) {
        Test::call_hooks(&self.before_hooks);
    }

    fn after(&self) {
        Test::call_hooks(&self.after_hooks);
    }

    pub fn run(&self) -> TestResult {
        self.before();

        // NOTE: Calling a test func should not fail for any other reason than:
        // - `should_fail` has been set to `true`
        // - the behaviour tested does not hold
        logging::accum();
        logging::add_indent();
        let now = Instant::now();

        let passed: bool = match self.func.call(&[]) {
            Ok(_) => {
                // Log error and mark test as failed if should_fail is `true`, but test passes
                // Otherwise mark test as passed
                if self.should_fail {
                    logging::error!("Expected test to fail but it passed successfully!");
                    false
                } else {
                    true
                }
            }
            Err(err) => {
                // Mark test as passed if should_fail is `true`
                // Log error and mark test as failed if should_fail is `false`
                if self.should_fail {
                    true
                } else {
                    logging::add_indent();
                    logging::debug!(err);
                    logging::sub_indent();
                    false
                }
            }
        };

        // Convert the elapsed time to milliseconds
        let elapsed_in_ms = now.elapsed().as_secs_f32() * 1000.0;

        logging::sub_indent();
        let logs = logging::flush();

        let msg = format!(
            "{} - {}",
            self.name.clone(),
            format!("{elapsed_in_ms:.3?}ms").bright_blue()
        );
        if passed {
            logging::success!(msg);
        } else {
            logging::error!(msg);
        }

        // Print the logs after the test result.
        if passed && !logs.is_empty() {
            logging::default!(&logs);
        }

        self.after();

        TestResult { passed, logs }
    }
}

impl<C: Blockchain> From<&MatchstickInstance<C>> for TestGroup {
    fn from(matchstick: &MatchstickInstance<C>) -> Self {
        let table = matchstick.instance.get_table("table").unwrap_or_else(|| {
            logging::critical!(
                "WebAssembly.Table was not exported from the AssemblyScript sources.
                    (Please compile with the `--exportTable` option.)"
            )
        });

        let functions = matchstick.instance_ctx().meta_tests.clone();
        build_test_group(matchstick, "", functions, &table)
    }
}

// A recursive function that builds the the test suite from a single test.ts file.
// The functions creates a TestGroup and arranges the function based on their role.
fn build_test_group<C: graph::blockchain::Blockchain>(
    matchstick: &MatchstickInstance<C>,
    name: &str,
    functions: Vec<(String, bool, u32, String)>,
    table: &wasmtime::Table,
) -> TestGroup {
    let mut before_each = vec![];
    let mut after_each = vec![];
    let mut test_group = TestGroup {
        name: name.to_owned(),
        testables: vec![],
        before_all: vec![],
        after_all: vec![],
    };

    for (t_name, should_fail, t_idx, role) in functions {
        let test = table
            .get(t_idx)
            .unwrap_or_else(|| {
                logging::critical!(
                    "Could not get WebAssembly.Table entry with index '{}'.",
                    t_idx,
                )
            })
            .unwrap_funcref()
            .unwrap()
            .to_owned();

        match role.as_str() {
            "beforeAll" => {
                test_group.before_all.push(test.clone());
            }
            "afterAll" => {
                test_group.after_all.push(test.clone());
            }
            "beforeEach" => {
                before_each.push(test.clone());
            }
            "afterEach" => {
                after_each.push(test.clone());
            }
            "test" => test_group.testables.push(Testable::Test(Test::new(
                t_name.to_string(),
                should_fail,
                test.clone(),
            ))),
            "describe" => {
                let nested_functions = register_describe(matchstick, t_idx);
                let nested_test_group =
                    build_test_group(matchstick, &t_name, nested_functions, table);
                test_group
                    .testables
                    .push(Testable::Group(nested_test_group))
            }
            _ => {
                logging::critical!("Unrecognized function type `{}`", role)
            }
        }
    }

    update_test_hooks(&mut test_group, before_each.clone(), after_each.clone());

    test_group
}

// A recursive function that assigns before/after_each functions to each Test
fn update_test_hooks(test_group: &mut TestGroup, before_each: Vec<Func>, after_each: Vec<Func>) {
    for testable in test_group.testables.iter_mut() {
        match testable {
            Testable::Test(test) => {
                test.before_hooks.splice(0..0, before_each.clone());
                test.after_hooks.append(&mut after_each.clone());
            }
            Testable::Group(group) => {
                update_test_hooks(group, before_each.clone(), after_each.clone());
            }
        }
    }
}

// In order to get all functions inside a describe() block, we need to create a clone
// of the current MatchstickInstance, then fetch and execute the said describe() function by it's id
// from the context of the cloned instance. This will trigger the registration of all the functions
// from the describe into the cloned MatchstickInstance's meta_tests field.
// Then we can get the difference between the orignal meta_test and the cloned one and return it.
fn register_describe<C: graph::blockchain::Blockchain>(
    matchstick: &MatchstickInstance<C>,
    func_idx: u32,
) -> Vec<(String, bool, u32, String)> {
    let host_metrics = matchstick.instance_ctx().wasm_ctx.host_metrics.clone();
    let valid_module = matchstick.instance_ctx().wasm_ctx.valid_module.clone();
    let ctx = matchstick
        .instance_ctx()
        .wasm_ctx
        .ctx
        .derive_with_empty_block_state();
    let experimental_features = graph_runtime_wasm::ExperimentalFeatures {
        allow_non_deterministic_ipfs: true,
    };

    let matchstick_clone = crate::MatchstickInstance::<_>::from_valid_module_with_ctx(
        valid_module,
        ctx.derive_with_empty_block_state(),
        host_metrics,
        None,
        experimental_features,
    )
    .unwrap();

    let table = matchstick_clone
        .instance
        .get_table("table")
        .unwrap_or_else(|| {
            logging::critical!(
                "WebAssembly.Table was not exported from the AssemblyScript sources.
                (Please compile with the `--exportTable` option.)"
            )
        });

    let meta_tests = matchstick_clone.instance_ctx().meta_tests.clone();

    let func = table
        .get(func_idx)
        .unwrap_or_else(|| {
            logging::critical!(
                "Could not get WebAssembly.Table entry with index '{}'.",
                func_idx,
            )
        })
        .unwrap_funcref()
        .unwrap()
        .to_owned();

    func.call(&[]).expect("Failed to execute function");

    let updated_meta_tests = matchstick_clone.instance_ctx().meta_tests.clone();

    updated_meta_tests
        .into_iter()
        .filter(|item| !meta_tests.contains(item))
        .collect()
}
