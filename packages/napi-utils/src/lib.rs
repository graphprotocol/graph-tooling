#[macro_use]
extern crate napi_derive;

use napi::Result;
use std::cell::RefCell;
use std::path::PathBuf;

mod cli;
mod compiler;
mod config;
mod context;
mod coverage;
mod instance;
mod integration_tests;
mod logging;
mod parser;
mod subgraph_store;
mod test_suite;
mod unit_tests;
mod writable_store;

use crate::instance::MatchstickInstance;

thread_local! {
    pub static MANIFEST_LOCATION: RefCell<PathBuf> = RefCell::new(PathBuf::new());
    pub static SCHEMA_LOCATION: RefCell<PathBuf> = RefCell::new(PathBuf::new());
    pub static TESTS_LOCATION: RefCell<PathBuf> = RefCell::new(PathBuf::new());
    pub static LIBS_LOCATION: RefCell<PathBuf> = RefCell::new(PathBuf::new());
}

// nAPI scoped exported modules
mod testing;
mod validation;

// Testing exports
#[napi]
pub fn run_tests(args: Vec<String>) -> Result<()> {
  testing::run_tests(args)
}

// Validation exports
#[napi]
pub fn are_numbers_equal(num1: i32, num2: i32) -> bool {
  validation::are_numbers_equal(num1, num2)
}
