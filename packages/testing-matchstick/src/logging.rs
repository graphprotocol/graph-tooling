use std::fmt::{self, Write};

use colored::Colorize;

/// Controls the amount of indentation added and substracted.
static MARGIN: usize = 2;
/// Current indentation when logging.
pub static mut INDENT: usize = 0;
pub fn add_indent() {
    unsafe { INDENT += MARGIN };
}
pub fn sub_indent() {
    unsafe { INDENT -= MARGIN };
}
pub fn clear_indent() {
    unsafe { INDENT = 0 };
}

/// Whether to accumulate the logs or print them as they come.
static mut ACCUM: bool = false;
pub(crate) static mut LOGS: Vec<String> = vec![];

/// Start accumulating the logs instead of printing them directly.
pub fn accum() {
    unsafe { ACCUM = true };
}

/// Flush the accumulated logs by producing a resulting string
/// and exit the accumulation mode of logging.
pub fn flush() -> String {
    let mut buf = String::new();
    unsafe {
        ACCUM = false;
        LOGS.iter().for_each(|s| {
            writeln!(&mut buf, "{s}").unwrap_or_else(|err| panic!("{}", Log::Critical(err)))
        });
        LOGS.clear();
    };
    buf
}

pub enum Log<T: fmt::Display> {
    Critical(T),
    Error(T),
    Warning(T),
    Info(T),
    Debug(T),
    Success(T),
    Default(T),
}

impl<T: fmt::Display> Log<T> {
    pub fn new(level: u32, s: T) -> Self {
        match level {
            0 => Log::Critical(s),
            1 => Log::Error(s),
            2 => Log::Warning(s),
            3 => Log::Info(s),
            4 => Log::Debug(s),
            5 => Log::Success(s),
            6 => Log::Default(s),

            _ => panic!("Level is not supported!"),
        }
    }

    pub fn println(&self) {
        let s = self.to_string();
        unsafe {
            if ACCUM {
                LOGS.push(s);
                return;
            }
        }
        println!("{s}");
    }
}

impl<T: fmt::Display> fmt::Display for Log<T> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Log::Critical(s) => format!("🆘 {s}").bold().red(),
            Log::Error(s) => format!("𝖷 {s}").bold().red(),
            Log::Warning(s) => format!("⚠️  {s}").yellow(),
            Log::Info(s) => format!("💬 {s}").italic(),
            Log::Debug(s) => format!("🛠  {s}").italic().cyan(),
            Log::Success(s) => format!("√ {s}").bold().green(),
            Log::Default(s) => format!("{s}").normal(),
        };
        unsafe { write!(f, "{}{}", " ".repeat(INDENT), s) }
    }
}

macro_rules! log {
    ($log_level:expr, $log_string:expr) => ({
        $crate::logging::Log::new($log_level, $log_string).println();
    });

    ($log_level:expr, $log_string:expr, $($arg:tt)*) => ({
        $crate::logging::Log::new($log_level, format!($log_string, $($arg)*)).println();
    });
}

/// Prints the message formatted with the passed color identifier
/// Can accept multiple style options.
/// log_with_style!(bright_red, "Hello world!")
/// log_with_style!(bold, green, "Hello {}", "world!")
/// log_with_style!(bold, blue, on_yellow, "{} {}", "Hello", "world!")
macro_rules! log_with_style {
    ($($log_style:ident,)+ $log_string:literal) => ({
        $crate::logging::log!(6, $log_string$(.$log_style())+)
    });

    ($($log_style:ident,)+ $log_string:literal, $($arg:tt)*) => ({
        $crate::logging::log!(6, format!($log_string, $($arg)*)$(.$log_style())+)
    });
}

/// This macro will panic
macro_rules! critical {
    ($log_string:expr) => ({
        $crate::logging::clear_indent();
        panic!("{}", $crate::logging::Log::Critical($log_string));
    });

    ($log_string:expr, $($arg:tt)*) => ({
        $crate::logging::clear_indent();
        panic!("{}", $crate::logging::Log::Critical(format!($log_string, $($arg)*)));
    });
}

macro_rules! error {
    ($($arg:tt)*) => ({
        $crate::logging::log!(1, $($arg)*);
    });
}

macro_rules! warning {
    ($($arg:tt)*) => ({
        $crate::logging::log!(2, $($arg)*);
    });
}

macro_rules! info {
    ($($arg:tt)*) => ({
        $crate::logging::log!(3, $($arg)*);
    });
}

macro_rules! debug {
    ($($arg:tt)*) => ({
        $crate::logging::log!(4, $($arg)*);
    });
}

macro_rules! success {
    ($($arg:tt)*) => ({
        $crate::logging::log!(5, $($arg)*);
    });
}

macro_rules! default {
    ($($arg:tt)*) => ({
        $crate::logging::log!(6, $($arg)*);
    });
}

pub(crate) use {critical, debug, default, error, info, log, log_with_style, success, warning};
