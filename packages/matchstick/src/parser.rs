use serde_yaml::{Sequence, Value};
use std::collections::HashMap;

use crate::logging;

/// Parses the yaml file
/// If the parsing fails returns a serde Value containing an empty String
pub fn parse_yaml(path: &str) -> Value {
    let yaml_content = std::fs::read_to_string(path).unwrap_or_else(|err| {
        logging::critical!(
            "Something went wrong while trying to read `{}`: {}",
            path,
            err,
        )
    });

    // Print warning and return empty string Value if parsing fails
    serde_yaml::from_str(&yaml_content).unwrap_or_else(|_| {
        logging::warning!("{} is empty or contains invalid values!", path);
        Value::String("".to_owned())
    })
}

/// Extracts the String value of the passed key
/// Panics if the key is missing or can't convert the value to string
fn extract_string(value: &Value, key: &str) -> String {
    value
        .get(key)
        .unwrap_or_else(|| panic!("Couldn't find key `{key}` in subgraph.yaml"))
        .as_str()
        .unwrap_or_else(|| panic!("Couldn't parse `{key}` as str"))
        .to_owned()
}

/// Extracts the string value of the passed key from the parsed yaml
/// Fallbacks to the default value if it fails to extract the string for some reason
pub fn extract_string_or(value: &Value, key: &str, default: String) -> String {
    value
        .get(key)
        .unwrap_or(&Value::String(default.clone()))
        .as_str()
        .unwrap_or(&default)
        .to_owned()
}

/// Extracts the value of the passed key as Sequence
/// Will return an empty Vec if the key is missing
/// Will panic if the value can't be parsed as Sequence
fn extract_vec(value: &Value, key: &str) -> Sequence {
    value
        .get(key)
        .unwrap_or(&Value::Sequence(vec![]))
        .as_sequence()
        .unwrap_or_else(|| panic!("Couldn't parse `{key}` as Sequence"))
        .to_vec()
}

/// Extracts the sources declared under dataSources or templates in the subraph.yaml
fn parse_sources(path: &str) -> Sequence {
    let subgraph_yaml = parse_yaml(path);

    let mut sources = vec![];
    sources.append(&mut extract_vec(&subgraph_yaml, "dataSources"));
    sources.append(&mut extract_vec(&subgraph_yaml, "templates"));

    sources
}

/// collects the event and call handlers for each source
/// declared under dataSources or templates
pub fn collect_handlers(path: &str) -> HashMap<String, Vec<String>> {
    parse_sources(path)
        .iter()
        .map(|source| {
            let name = extract_string(source, "name");

            let mapping = source
                .get("mapping")
                .expect("No key 'mapping' in datasource.");

            let mut functions = vec![];

            functions.append(&mut extract_vec(mapping, "eventHandlers"));
            functions.append(&mut extract_vec(mapping, "callHandlers"));

            let handlers = functions
                .iter()
                .map(|function| extract_string(function, "handler"))
                .collect();

            (name, handlers)
        })
        .collect()
}

pub fn collect_templates(path: &str) -> Vec<(String, String)> {
    let subgraph_yaml = parse_yaml(path);

    extract_vec(&subgraph_yaml, "templates")
        .iter()
        .filter_map(|template| {
            let kind = template.get("kind").unwrap().as_str().unwrap().to_owned();

            if ["ethereum", "ethereum/contract", "file/ipfs"]
                .iter()
                .any(|k| k == &kind)
            {
                let name = template.get("name").unwrap().as_str().unwrap().to_owned();
                Some((name, kind))
            } else {
                logging::warning!(
                    "Template with kind `{}` is not supported by matchstick.",
                    kind
                );
                None
            }
        })
        .collect()
}

/// Extracts the schema location from subraph.yaml
/// Will panic if the `schema` or `file` key is missing
pub fn get_schema_location(path: &str) -> String {
    let subgraph_yaml = parse_yaml(path);

    let schema = subgraph_yaml
        .get("schema")
        .expect("Couldn't get schema from yaml file.");

    extract_string(schema, "file")
}

#[cfg(test)]
mod parser_tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    #[should_panic(
        expected = "🆘 Something went wrong while trying to read `mocks/yamls/no_config.yaml`: No such file or directory (os error 2)"
    )]
    fn parse_yaml_should_panic_when_file_is_missing() {
        parse_yaml("mocks/yamls/no_config.yaml");
    }

    #[test]

    fn parse_yaml_returns_empty_string_value_if_config_is_empty() {
        let yaml = parse_yaml("mocks/yamls/matchstick_empty.yaml");

        assert_eq!(yaml, Value::String("".to_owned()))
    }

    #[test]
    fn get_schema_location_returns_schema_location() {
        let schema_location = get_schema_location("mocks/yamls/subgraph.yaml");

        assert_eq!(schema_location, "./schema.graphql".to_owned())
    }

    #[test]
    #[should_panic(expected = "Couldn't find key `name` in subgraph.yaml")]
    fn parse_string_should_panic_if_key_missing() {
        let yaml = parse_yaml("mocks/yamls/subgraph_no_name.yaml");
        extract_string(&yaml, "name");
    }

    #[test]
    fn extract_string_or_returns_value_as_string() {
        let config_yaml = parse_yaml("mocks/yamls/matchstick.yaml");
        let test_folder = extract_string_or(&config_yaml, "testsFolder", "./tests".to_owned());

        assert_eq!(test_folder, "./specs".to_owned())
    }

    #[test]
    fn extract_string_or_returns_default_when_key_is_missing() {
        let config_yaml = parse_yaml("mocks/yamls/matchstick.yaml");
        let test_folder =
            extract_string_or(&config_yaml, "libsFolder", "./node_modules".to_owned());

        assert_eq!(test_folder, "./node_modules".to_owned())
    }

    #[test]
    fn collect_handlers_returns_all_handlers() {
        let handlers = collect_handlers("mocks/yamls/subgraph.yaml");
        let mut expected: HashMap<String, Vec<String>> = HashMap::new();
        expected.insert(
            "Gravity".to_owned(),
            vec![
                "handleNewGravatar".to_owned(),
                "handleCreateGravatar".to_owned(),
            ],
        );
        expected.insert(
            "GraphTokenLockWallet".to_owned(),
            vec!["handleTokensReleased".to_owned()],
        );

        assert_eq!(handlers, expected)
    }

    #[test]
    fn collect_handlers_returns_empty_vec_if_no_handlers() {
        let handlers = collect_handlers("mocks/yamls/subgraph_no_handlers.yaml");
        let mut expected: HashMap<String, Vec<String>> = HashMap::new();
        expected.insert("Gravity".to_owned(), vec![]);

        assert_eq!(handlers, expected)
    }
}
