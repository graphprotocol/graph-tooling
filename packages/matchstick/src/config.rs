use std::path::PathBuf;

use crate::parser;

pub struct MatchstickConfig {
    pub libs_path: String,
    pub tests_path: String,
    pub manifest_path: String,
}

impl MatchstickConfig {
    /// Creates a MatchstickConfig with default values
    fn new() -> MatchstickConfig {
        MatchstickConfig {
            libs_path: "./node_modules".to_owned(),
            tests_path: "./tests".to_owned(),
            manifest_path: "./subgraph.yaml".to_owned(),
        }
    }

    /// Creates a new MatchstickConfig from the passed matchstcik config.
    /// If the config does not exist or keys are missing, returns the default values
    pub fn from(path: &str) -> MatchstickConfig {
        let mut config = MatchstickConfig::new();

        if PathBuf::from(path).exists() {
            let matchstick_yaml = parser::parse_yaml(path);
            // Tries to get the tests or libs folder value from the config file.
            // If the attribute doesn't exist returns the default value.
            config.tests_path =
                parser::extract_string_or(&matchstick_yaml, "testsFolder", config.tests_path);
            config.libs_path =
                parser::extract_string_or(&matchstick_yaml, "libsFolder", config.libs_path);
            config.manifest_path =
                parser::extract_string_or(&matchstick_yaml, "manifestPath", config.manifest_path);
        }

        config
    }
}

#[cfg(test)]
mod config_tests {
    use crate::config::MatchstickConfig;

    #[test]
    fn config_from_returns_default_values_if_no_config() {
        let config = MatchstickConfig::from("mocks/yamls/no_config.yaml");

        assert_eq!(config.libs_path, "./node_modules".to_owned());
        assert_eq!(config.tests_path, "./tests".to_owned());
        assert_eq!(config.manifest_path, "./subgraph.yaml".to_owned());
    }

    #[test]
    fn config_from_returns_custom_folder_from_config() {
        let config = MatchstickConfig::from("mocks/yamls/matchstick.yaml");

        assert_eq!(config.tests_path, "./specs".to_owned());
    }
}
