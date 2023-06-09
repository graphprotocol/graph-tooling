use std::collections::HashMap;
use substreams::scalar::{BigDecimal, BigInt};
use substreams_entity_change::pb::entity::entity_change::Operation;
use substreams_entity_change::pb::entity::value::Typed;
use substreams_entity_change::pb::entity::{Array, EntityChange, EntityChanges, Field, Value};

pub struct Tables {
    // Map from table name to the primary keys within that table
    pub tables: HashMap<String, Rows>,
}

impl Tables {
    pub fn new() -> Self {
        Tables {
            tables: HashMap::new(),
        }
    }

    pub fn create_row<K: AsRef<str>>(&mut self, table: &str, key: K) -> &mut Row {
        let rows = self.tables.entry(table.to_string()).or_insert(Rows::new());
        let row = rows
            .pks
            .entry(key.as_ref().to_string())
            .or_insert(Row::new());
        match row.operation {
            Operation::Unset => {
                row.operation = Operation::Create;
            }
            Operation::Create => {}
            Operation::Update => {
                panic!("cannot create a row that was marked for update")
            }
            Operation::Delete => {
                panic!(
                    "cannot create a row after a scheduled delete operation - table: {} key: {}",
                    table,
                    key.as_ref().to_string()
                )
            }
            Operation::Final => {}
        }
        row
    }

    pub fn update_row<K: AsRef<str>>(&mut self, table: &str, key: K) -> &mut Row {
        let rows = self.tables.entry(table.to_string()).or_insert(Rows::new());
        let row = rows
            .pks
            .entry(key.as_ref().to_string())
            .or_insert(Row::new());
        match row.operation {
            Operation::Unset => {
                row.operation = Operation::Update;
            }
            Operation::Create => {}
            Operation::Update => {}
            Operation::Delete => {
                panic!(
                    "cannot create a row after a scheduled delete operation - table: {} key: {}",
                    table,
                    key.as_ref().to_string()
                )
            }
            Operation::Final => {}
        }
        row
    }

    pub fn delete_row<K: AsRef<str>>(&mut self, table: &str, key: K) -> &mut Row {
        let rows = self.tables.entry(table.to_string()).or_insert(Rows::new());
        let row = rows
            .pks
            .entry(key.as_ref().to_string())
            .or_insert(Row::new());
        match row.operation {
            Operation::Unset => {
                row.operation = Operation::Delete;
            }
            Operation::Create => {
                // simply clear the thing
                row.operation = Operation::Unset;
                row.columns = HashMap::new();
            }
            Operation::Update => {}
            Operation::Delete => {
                panic!(
                    "cannot create a row after a scheduled delete operation - table: {} key: {}",
                    table,
                    key.as_ref().to_string()
                )
            }
            Operation::Final => {}
        }
        row.operation = Operation::Delete;
        row.columns = HashMap::new();
        row
    }

    // Convert Tables into an EntityChanges protobuf object
    pub fn to_entity_changes(mut self) -> EntityChanges {
        let mut entities = EntityChanges::default();
        for (table, rows) in self.tables.iter_mut() {
            for (pk, row) in rows.pks.iter_mut() {
                // Map the row.operation into an EntityChange.Operation
                let mut change = EntityChange::new(table, pk, 0, row.operation);
                for (field, value) in row.columns.iter_mut() {
                    change.fields.push(Field {
                        name: field.clone(),
                        new_value: Some(value.clone()),
                        old_value: None,
                    });
                }
                entities.entity_changes.push(change.clone());
                if row.finalized {
                    entities
                        .entity_changes
                        .push(EntityChange::new(table, pk, 0, Operation::Final));
                }
            }
        }
        entities
    }
}

pub struct Rows {
    // Map of primary keys within this table, to the fields within
    pub pks: HashMap<String, Row>,
}

impl Rows {
    pub fn new() -> Self {
        Rows {
            pks: HashMap::new(),
        }
    }
}

pub struct Row {
    // Verify that we don't try to delete the same row as we're creating it
    pub operation: Operation,
    // Map of field name to its last change
    pub columns: HashMap<String, Value>,
    // Finalized: Last update or delete
    pub finalized: bool,
}

impl Row {
    pub fn new() -> Self {
        Row {
            operation: Operation::Unset,
            columns: HashMap::new(),
            finalized: false,
        }
    }

    // TODO: add set_bigint, set_bigdecimal which both take a bi/bd string representation
    pub fn set<T: ToValue>(&mut self, name: &str, value: T) -> &mut Self {
        if self.operation == Operation::Delete {
            panic!("cannot set fields on a delete operation")
        }
        self.columns.insert(name.to_string(), value.to_value());
        self
    }

    pub fn set_bigint(&mut self, name: &str, value: &String) -> &mut Self {
        self.columns.insert(
            name.to_string(),
            Value {
                typed: Some(Typed::Bigint(value.clone())),
            },
        );
        self
    }

    pub fn set_bigdecimal(&mut self, name: &str, value: &String) -> &mut Self {
        self.columns.insert(
            name.to_string(),
            Value {
                typed: Some(Typed::Bigdecimal(value.clone())),
            },
        );
        self
    }

    pub fn set_bigint_or_zero(&mut self, name: &str, value: &String) -> &mut Self {
        if value.len() == 0 {
            self.set_bigint(name, &"0".to_string())
        } else {
            self.set_bigint(name, value)
        }
    }

    pub fn mark_final(&mut self) -> &mut Self {
        self.finalized = true;
        self
    }
}

pub trait ToValue {
    fn to_value(&self) -> Value;
}

impl ToValue for bool {
    fn to_value(&self) -> Value {
        Value {
            typed: Some(Typed::Bool(*self)),
        }
    }
}

impl ToValue for &BigDecimal {
    fn to_value(&self) -> Value {
        Value {
            typed: Some(Typed::Bigdecimal(self.to_string())),
        }
    }
}

impl ToValue for BigDecimal {
    fn to_value(&self) -> Value {
        Value {
            typed: Some(Typed::Bigdecimal(self.to_string())),
        }
    }
}

impl ToValue for &BigInt {
    fn to_value(&self) -> Value {
        Value {
            typed: Some(Typed::Bigint(self.to_string())),
        }
    }
}

impl ToValue for BigInt {
    fn to_value(&self) -> Value {
        Value {
            typed: Some(Typed::Bigint(self.to_string())),
        }
    }
}

impl ToValue for &String {
    fn to_value(&self) -> Value {
        Value {
            typed: Some(Typed::String(self.to_string())),
        }
    }
}

impl ToValue for String {
    fn to_value(&self) -> Value {
        Value {
            typed: Some(Typed::String(self.to_string())),
        }
    }
}

impl ToValue for &Vec<u8> {
    fn to_value(&self) -> Value {
        Value {
            typed: Some(Typed::Bytes(base64::encode(self))),
        }
    }
}

impl ToValue for &Vec<String> {
    fn to_value(&self) -> Value {
        let mut list: Vec<Value> = vec![];
        for item in self.iter() {
            list.push(Value {
                typed: Some(Typed::String(item.clone())),
            });
        }

        Value {
            typed: Some(Typed::Array(Array { value: list })),
        }
    }
}

impl ToValue for u64 {
    fn to_value(&self) -> Value {
        Value {
            typed: Some(Typed::Bigint(self.to_string())),
        }
    }
}

impl ToValue for &u64 {
    fn to_value(&self) -> Value {
        Value {
            typed: Some(Typed::Bigint(self.to_string())),
        }
    }
}

impl ToValue for u32 {
    fn to_value(&self) -> Value {
        Value {
            typed: Some(Typed::Bigint(self.to_string())),
        }
    }
}

impl ToValue for i64 {
    fn to_value(&self) -> Value {
        Value {
            typed: Some(Typed::Bigint(self.to_string())),
        }
    }
}

impl ToValue for i32 {
    fn to_value(&self) -> Value {
        Value {
            typed: Some(Typed::Int32(*self)),
        }
    }
}
