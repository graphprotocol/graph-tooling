use regex::Regex;
use std::boxed::Box;

use graph::{
    data::store::{scalar::Bytes, Value},
    prelude::{
        ethabi::{ParamType, Token},
        BigInt,
    },
};

use crate::logging;

/// Converts string argument types from the function signature into ethabi::ParamType.
pub(crate) fn get_kind(kind: String) -> ParamType {
    let kind_str = kind.trim();
    let int_r = Regex::new(r#"^int\d+$"#).expect("Invalid uint/int regex");
    let uint_r = Regex::new(r#"^uint\d+$"#).expect("Invalid uint/int regex");
    let array_r = Regex::new(r#"\w*\d*\[\]$"#).expect("Invalid array regex");
    let fixed_bytes_r = Regex::new(r#"bytes\d+$"#).expect("Invalid fixedBytes regex");
    let fixed_array_r = Regex::new(r#"\w*\d*\[\d+\]$"#).expect("Invalid fixedArray regex");
    let tuple_r = Regex::new(r#"\((.+?)(?:,|$)*\)$"#).expect("Invalid tuple regex");

    match kind_str {
        "address" => ParamType::Address,
        "bool" => ParamType::Bool,
        "bytes" => ParamType::Bytes,
        "string" => ParamType::String,
        kind_str if int_r.is_match(kind_str) => {
            let size = kind_str.replace("int", "").parse::<usize>().unwrap();
            ParamType::Int(size)
        }
        kind_str if uint_r.is_match(kind_str) => {
            let size = kind_str.replace("uint", "").parse::<usize>().unwrap();
            ParamType::Uint(size)
        }
        kind_str if array_r.is_match(kind_str) => {
            let p_type = Box::new(get_kind(kind_str.replace("[]", "")));
            ParamType::Array(p_type)
        }
        kind_str if fixed_bytes_r.is_match(kind_str) => {
            let size = kind_str.replace("bytes", "").parse::<usize>().unwrap();
            ParamType::FixedBytes(size)
        }
        kind_str if fixed_array_r.is_match(kind_str) => {
            let tmp_str = kind.replace(']', "");
            let components: Vec<&str> = tmp_str.split('[').collect();
            let p_type = Box::new(get_kind(components[0].to_owned()));
            let size = components[1].parse::<usize>().unwrap();
            ParamType::FixedArray(p_type, size)
        }
        kind_str if tuple_r.is_match(kind_str) => {
            let tmp_str = &kind_str[1..kind_str.len() - 1];
            let str_components: Vec<String> = collect_types(tmp_str);
            let components: Vec<ParamType> = str_components.into_iter().map(get_kind).collect();
            ParamType::Tuple(components)
        }
        _ => logging::critical!("Unrecognized argument type `{}`", kind_str),
    }
}

/// Converts ethabi::Token into graph::data::store::Value
/// This is needed because ethabi::Token stores Int values as a Uint256
/// and negative numbers are stored as overflowed Uint256
/// e.g -2147483648 is stored as
/// 115792089237316195423570985008687907853269984665640564039457584007910982156288
pub(crate) fn get_token_value(token: Token) -> Value {
    match token {
        Token::Address(address) => Value::Bytes(Bytes::from(address)),
        Token::FixedBytes(bytes) | Token::Bytes(bytes) => {
            Value::Bytes(Bytes::from(bytes.as_slice()))
        }
        Token::Int(uint) => Value::BigInt(BigInt::from_signed_u256(&uint)),
        Token::Uint(uint) => Value::BigInt(BigInt::from_unsigned_u256(&uint)),
        Token::Bool(bool) => Value::Bool(bool),
        Token::String(string) => Value::String(string),
        Token::FixedArray(tokens) | Token::Array(tokens) | Token::Tuple(tokens) => {
            Value::List(tokens.into_iter().map(get_token_value).collect())
        }
    }
}

/// Collects the arguments types from the function signature and returns a Vec
/// Because the arguments could be tuples, it's not possible jus to split on every comma
/// so we count the open parentheses and only split when there are none currently open.
pub(crate) fn collect_types(arg_str: &str) -> Vec<String> {
    let mut arg_types: Vec<String> = vec![];

    if !arg_str.is_empty() {
        let mut parenthesis = 0;
        let mut arg_type = "".to_owned();

        for char in arg_str.chars() {
            if char == '(' {
                arg_type = arg_type.to_owned() + "(";
                parenthesis += 1;
            } else if char == ')' {
                arg_type = arg_type.to_owned() + ")";
                parenthesis -= 1;
            } else if char == ',' && parenthesis == 0 {
                arg_types.push(arg_type);
                arg_type = "".to_owned();
            } else {
                arg_type = arg_type.to_owned() + &char.to_string();
            }
        }

        if !arg_type.is_empty() {
            arg_types.push(arg_type)
        }
    }

    arg_types
}
