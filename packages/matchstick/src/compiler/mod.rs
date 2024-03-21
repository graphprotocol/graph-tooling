use clap::ArgMatches;
use colored::Colorize;
use std::collections::HashMap;
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, ExitStatus};

#[cfg(unix)]
use std::os::unix::process::ExitStatusExt;

#[cfg(windows)]
use std::os::windows::process::ExitStatusExt;

mod sources;

use crate::logging;
use sources::*;

pub struct Compiler {
    lib: PathBuf,
    exec: PathBuf,
    global: PathBuf,
    options: Vec<String>,
}

pub struct CompileOutput {
    pub status: ExitStatus,
    pub stdout: Vec<u8>,
    pub stderr: Vec<u8>,
    pub file: PathBuf,
}

#[allow(dead_code)]
impl Compiler {
    pub fn new(lib: PathBuf) -> Self {
        if !lib.exists() {
            logging::critical!("Path to lib {:?} does not exist!", lib);
        }

        let work_dir = std::env::current_dir().unwrap();

        let abs_lib_path = work_dir
            .join(&lib)
            .canonicalize()
            .unwrap_or_else(|_| logging::critical!("libs folder {:?} does not exists!", &lib));

        Compiler {
            exec: abs_lib_path.join("assemblyscript/bin/asc"),
            global: abs_lib_path.join("@graphprotocol/graph-ts/global/global.ts"),
            lib: abs_lib_path,
            options: vec![String::from("--explicitStart")],
        }
    }

    pub fn export_table(mut self) -> Self {
        self.options.push("--exportTable".to_owned());
        self
    }

    pub fn optimize(mut self) -> Self {
        self.options.push("--optimize".to_owned());
        self
    }

    pub fn debug(mut self) -> Self {
        self.options.push("--debug".to_owned());
        self
    }

    pub fn export_runtime(mut self) -> Self {
        self.options.push("--exportRuntime".to_owned());
        self
    }

    pub fn runtime(mut self, s: &str) -> Self {
        self.options.push("--runtime".to_owned());
        self.options.push(s.to_owned());
        self
    }

    pub fn enable(mut self, s: &str) -> Self {
        self.options.push("--enable".to_owned());
        self.options.push(s.to_owned());
        self
    }

    pub fn execute(&self, matches: &ArgMatches) -> HashMap<String, CompileOutput> {
        let outputs = get_test_sources(matches)
            .into_iter()
            .map(|(name, in_file)| {
                let mut out_file = PathBuf::new();

                crate::TESTS_LOCATION.with(|path| {
                    let bin_location = path.borrow().join(".bin");
                    out_file = bin_location.join(&name).with_extension("wasm");
                });

                let output = if matches.is_present("recompile")
                    || !Path::new(&out_file).exists()
                    || is_source_modified(&in_file, &out_file)
                {
                    logging::info!("Compiling {}...", name.bright_blue());

                    self.compile(in_file, out_file)
                } else {
                    logging::info!("{} skipped!", name.bright_blue());

                    self.skip_compile(out_file)
                };

                (name, output)
            })
            .collect();

        verify_outputs(&outputs);

        outputs
    }

    fn compile(&self, in_file: PathBuf, out_file: PathBuf) -> CompileOutput {
        let output = Command::new(&self.exec)
            .args([in_file])
            .arg(&self.global)
            .arg("--lib")
            .arg(&self.lib)
            .args(&self.options)
            .arg("--outFile")
            .arg(out_file.clone())
            .output()
            .unwrap_or_else(|err|
                logging::critical!(
                    "Internal error during compilation: {}.\nCommand path: {:?}\nGlobals path: {:?}\nLibs folder: {:?}",
                     err,
                     &self.exec,
                     &self.global,
                     &self.lib
                 )
            );

        CompileOutput {
            status: output.status,
            stdout: output.stdout,
            stderr: output.stderr,
            file: out_file,
        }
    }

    fn skip_compile(&self, out_file: PathBuf) -> CompileOutput {
        CompileOutput {
            status: ExitStatusExt::from_raw(0),
            stdout: vec![],
            stderr: vec![],
            file: out_file,
        }
    }
}

fn verify_outputs(outputs: &HashMap<String, CompileOutput>) {
    if outputs.values().any(|output| !output.status.success()) {
        outputs.values().for_each(|output| {
            io::stderr()
                .write_all(&output.stderr)
                .unwrap_or_else(|err| {
                    logging::critical!("Could not write to `stderr`: {}", err);
                });
        });

        logging::critical!("Please attend to the compilation errors above!");
    }
}
