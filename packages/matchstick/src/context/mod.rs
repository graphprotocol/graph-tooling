use std::collections::HashMap;
use std::str::FromStr;

use anyhow::{anyhow, Context};
use graph::{
    blockchain::Blockchain,
    data::{
        store::{Attribute, Value},
        value::Word,
    },
    prelude::{
        ethabi::{Address, Token},
        DataSourceContext,
    },
    runtime::{
        asc_get, asc_new, gas::GasCounter, AscIndexId, AscPtr, AscType, FromAscObj,
        HostExportError, ToAscObj,
    },
    semver::Version,
};
use graph_chain_ethereum::runtime::{
    abi::AscUnresolvedContractCall_0_0_4, runtime_adapter::UnresolvedContractCall,
};
use graph_runtime_wasm::{
    asc_abi::class::{
        Array, AscEntity, AscEnum, AscEnumArray, AscString, EnumPayload, EthereumValueKind,
        StoreValueKind, Uint8Array,
    },
    module::WasmInstanceContext,
    ExperimentalFeatures,
};
use lazy_static::lazy_static;
use serde::Serialize;
use serde_json::to_string_pretty;

use crate::logging;

mod conversion;
mod schema;
mod template;
use conversion::{collect_types, get_kind, get_token_value};
use schema::{get_entity_required_fields, populate_derived_fields, populate_schema_definitions};
use template::{data_source_create, populate_templates};

lazy_static! {
    /// Special tokens...
    pub(crate) static ref REVERTS_IDENTIFIER: Vec<Token> =
        vec![Token::Bytes(vec![255, 255, 255, 255, 255, 255, 255])];
}

type Store = HashMap<String, HashMap<String, StoreEntity>>;

/// Type of the store that needs to be accessed
pub enum StoreScope {
    Global,
    Cache,
}

#[derive(Serialize)]
#[serde(untagged)]
enum LogEntityValue {
    Native(Value),
    Derived(Vec<StoreEntity>),
}

type Entity = Vec<(Word, graph::prelude::Value)>;

type StoreEntity = HashMap<String, Value>;

trait ToEntity {
    fn to_entity(&mut self) -> Entity;
}

impl ToEntity for StoreEntity {
    fn to_entity(&mut self) -> Entity {
        self.iter_mut()
            .map(|(k, v)| (Word::from(k.to_string()), v.clone()))
            .collect()
    }
}

type TemplateStore = HashMap<String, HashMap<String, TemplateInfo>>;

#[derive(Debug, serde::Serialize)]
pub(crate) struct TemplateInfo {
    kind: String,
    name: String,
    address: String,
    context: Option<DataSourceContext>,
}

/// The Matchstick Instance Context wraps WASM Instance Context and
/// implements the external functions.
pub struct MatchstickInstanceContext<C: Blockchain> {
    /// Handle to WASM Instance Context.
    pub wasm_ctx: WasmInstanceContext<C>,
    /// global store
    /// Store<EntityType, EntityTypeStore<EntityId, Entity<Field, Value>>>.
    pub(crate) store: Store,
    /// store for the current block
    /// Store<EntityType, EntityTypeStore<EntityId, Entity<Field, Value>>>.
    pub(crate) cache_store: Store,
    /// Function-Return map storing mocked Smart Contracts' functions' return values.
    pub(crate) fn_ret_map: HashMap<String, Vec<Token>>,
    /// Registered tests metadata.
    pub meta_tests: Vec<(String, bool, u32, String)>,
    /// Holding the parent entity type, parent virtual field and a tuple of the derived entity type and derived entity field it points to
    /// The example below is taken from a schema.graphql file and will fill the map in the following way:
    /// {"GraphAccount": {"nameSignalTransactions", [("NameSignalTransaction", "signer")]}}
    /// ```
    /// type GraphAccount @entity {
    ///     id: ID!
    ///     nameSignalTransactions: [NameSignalTransaction!]! @derivedFrom(field: "signer")
    /// }
    /// type NameSignalTransaction @entity {
    ///     id: ID!
    ///     signer: GraphAccount!
    /// }
    /// ```
    pub(crate) derived: HashMap<String, HashMap<String, Vec<(String, String)>>>,
    /// Holds the graphql schema for easier access
    schema: HashMap<String, graphql_parser::schema::ObjectType<'static, String>>,
    interface_to_entities: HashMap<String, Vec<String>>,
    /// Holds the mocked return values of `dataSource.address()`, `dataSource.network()` and `dataSource.context()` in that order
    data_source_return_value: (
        Option<String>,
        Option<String>,
        Option<HashMap<Attribute, Value>>,
    ),
    /// Holds the mocked ipfs files in a HashMap, where key is the file hash, and the value is the
    /// path to the file that matchstick should read and parse
    pub(crate) ipfs: HashMap<String, String>,
    templates: TemplateStore,
    template_kinds: HashMap<String, String>,
}

/// Implementation of non-external functions.
impl<C: Blockchain> MatchstickInstanceContext<C> {
    pub fn new(wasm_ctx: WasmInstanceContext<C>) -> Self {
        let mut context = MatchstickInstanceContext {
            wasm_ctx,
            store: HashMap::new(),
            cache_store: HashMap::new(),
            fn_ret_map: HashMap::new(),
            meta_tests: Vec::new(),
            derived: HashMap::new(),
            schema: HashMap::new(),
            interface_to_entities: HashMap::new(),
            data_source_return_value: (None, None, None),
            ipfs: HashMap::new(),
            templates: HashMap::new(),
            template_kinds: HashMap::new(),
        };

        populate_schema_definitions(&mut context);
        populate_derived_fields(&mut context);
        populate_templates(&mut context);
        context
    }

    /// Constructs a unique ID for a given contract function.
    fn fn_id(
        contract_address: &str,
        fn_name: &str,
        fn_signature: &str,
        fn_args: &[Token],
    ) -> String {
        let mut unique_fn_string = String::from(contract_address) + fn_name + fn_signature;
        for element in fn_args.iter() {
            unique_fn_string += &element.to_string();
        }
        unique_fn_string
    }
}

/// Implementation of external functions (used in AssemblyScript sources).
impl<C: Blockchain> MatchstickInstanceContext<C> {
    fn resolve_asc_pointer<T, R>(&mut self, pointer: AscPtr<R>) -> T
    where
        R: AscType + AscIndexId,
        T: FromAscObj<R>,
    {
        asc_get(&self.wasm_ctx, pointer, &GasCounter::new(), 0).unwrap()
    }

    fn create_asc_pointer<E, T: ?Sized>(&mut self, rust_obj: &T) -> AscPtr<E>
    where
        E: AscType + AscIndexId,
        T: ToAscObj<E>,
    {
        asc_new(&mut self.wasm_ctx, rust_obj, &GasCounter::new()).unwrap()
    }

    /// function log(level: enum Level (u32), msg: string): void
    pub fn log(
        &mut self,
        _gas: &GasCounter,
        level: u32,
        msg_ptr: AscPtr<AscString>,
    ) -> Result<(), HostExportError> {
        let msg: String = self.resolve_asc_pointer(msg_ptr);

        match level {
            0 => logging::critical!(msg),
            _ => logging::log!(level, msg),
        }

        Ok(())
    }

    /// function logStore(): void
    pub fn log_store(&mut self, _gas: &GasCounter) -> Result<(), HostExportError> {
        let string_pretty =
            to_string_pretty(&self.store).unwrap_or_else(|err| logging::critical!(err));
        logging::debug!(string_pretty);

        Ok(())
    }

    /// function logDataSources(template: string): void
    pub fn log_data_sources(
        &mut self,
        _gas: &GasCounter,
        template_ptr: AscPtr<AscString>,
    ) -> Result<(), HostExportError> {
        let template: String = self.resolve_asc_pointer(template_ptr);

        let data_sources = self.templates.get(&template).unwrap_or_else(|| {
            logging::critical!(
                "(logDataSources) No template with name '{}' found.",
                template
            )
        });

        let string_pretty = to_string_pretty(&data_sources).unwrap_or_else(|err| {
            logging::critical!(
                "Something went wrong when trying to convert data sources to string: {}",
                err
            )
        });

        logging::debug!(string_pretty);

        Ok(())
    }

    /// function logEntity(entity: string, id: string, showRelated: bool): void
    pub fn log_entity(
        &mut self,
        _gas: &GasCounter,
        entity_type_ptr: AscPtr<AscString>,
        entity_id_ptr: AscPtr<AscString>,
        show_related_ptr: AscPtr<bool>,
    ) -> Result<(), HostExportError> {
        let entity_type: String = self.resolve_asc_pointer(entity_type_ptr);
        let entity_id: String = self.resolve_asc_pointer(entity_id_ptr);
        let show_related: bool = bool::from(EnumPayload(show_related_ptr.to_payload()));

        let mut log: HashMap<String, LogEntityValue> = HashMap::new();

        // validates whether the provided entity exists in the schema file
        if !self.schema.contains_key(&entity_type) {
            logging::critical!(
                "(logEntity) Entity \"{}\" does not match any of the schema definitions",
                &entity_type
            );
        }

        let entity = self.store.get(&entity_type).and_then(|x| x.get(&entity_id));

        if let Some(entity) = entity {
            let mut virtual_fields: Vec<String> = Vec::new();
            let has_virtual_fields = self.derived.contains_key(&entity_type);

            // prepares entity's native fields
            for (field, value) in entity.iter() {
                log.insert(field.clone(), LogEntityValue::Native(value.clone()));
            }

            // prepares entity's dervied fields
            if show_related && has_virtual_fields {
                virtual_fields = self
                    .derived
                    .get(&entity_type)
                    .unwrap()
                    .clone()
                    .into_keys()
                    .collect();
            }

            for virtual_field in virtual_fields.iter() {
                let related_entities: Vec<HashMap<String, Value>> =
                    self.load_related_entities(&entity_type, &entity_id, virtual_field);

                log.insert(
                    virtual_field.clone(),
                    LogEntityValue::Derived(related_entities),
                );
            }
        }

        let pretty_log = to_string_pretty(&log).unwrap_or_else(|err| logging::critical!(err));

        logging::debug!("{}", pretty_log);

        Ok(())
    }

    /// function clearStore(): void
    pub fn clear_store(&mut self, _gas: &GasCounter) -> Result<(), HostExportError> {
        self.store.clear();
        Ok(())
    }

    /// function clearInBlockStore(): void
    pub fn clear_cache_store(&mut self, _gas: &GasCounter) -> Result<(), HostExportError> {
        self.cache_store.clear();
        Ok(())
    }

    /// function _registerTest(name: string, shouldFail: bool, funcIdx: u32): void
    pub fn register_test(
        &mut self,
        _gas: &GasCounter,
        name_ptr: AscPtr<AscString>,
        should_fail_ptr: AscPtr<bool>,
        func_idx: u32,
    ) -> Result<(), HostExportError> {
        let name: String = self.resolve_asc_pointer(name_ptr);
        let should_fail = bool::from(EnumPayload(should_fail_ptr.to_payload()));
        self.meta_tests
            .push((name, should_fail, func_idx, "test".to_owned()));
        Ok(())
    }

    /// function _registerDescribe(name: string, funcIdx: u32): void
    pub fn register_describe(
        &mut self,
        _gas: &GasCounter,
        name_ptr: AscPtr<AscString>,
        func_idx: u32,
    ) -> Result<(), HostExportError> {
        let name: String = self.resolve_asc_pointer(name_ptr);
        self.meta_tests
            .push((name, false, func_idx, "describe".to_owned()));

        Ok(())
    }

    /// function _registerHook(funcIdx: u32, role: string): void
    pub fn register_hook(
        &mut self,
        _gas: &GasCounter,
        func_idx: u32,
        role_ptr: AscPtr<AscString>,
    ) -> Result<(), HostExportError> {
        let role: String = self.resolve_asc_pointer(role_ptr);
        self.meta_tests
            .push((String::from(""), false, func_idx, role));
        Ok(())
    }

    /// function _assert.fieldEquals(
    ///     entityType: string, id: string,
    ///     fieldName: string, expectedVal: string,
    /// ): bool
    pub fn assert_field_equals(
        &mut self,
        _gas: &GasCounter,
        entity_type_ptr: AscPtr<AscString>,
        id_ptr: AscPtr<AscString>,
        field_name_ptr: AscPtr<AscString>,
        expected_val_ptr: AscPtr<AscString>,
    ) -> Result<bool, HostExportError> {
        let entity_type: String = self.resolve_asc_pointer(entity_type_ptr);
        let id: String = self.resolve_asc_pointer(id_ptr);
        let field_name: String = self.resolve_asc_pointer(field_name_ptr);
        let expected_val: String = self.resolve_asc_pointer(expected_val_ptr);

        if !self.store.contains_key(&entity_type) {
            logging::error!(
                "(assert.fieldEquals) No entities with type '{}' found.",
                &entity_type
            );

            return Ok(false);
        }

        let entities = self.store.get(&entity_type).unwrap();
        if !entities.contains_key(&id) {
            logging::error!(
                "(assert.fieldEquals) No entity with type '{}' and id '{}' found.",
                &entity_type,
                &id
            );

            return Ok(false);
        }

        let entity = entities.get(&id).unwrap();
        if !entity.contains_key(&field_name) {
            logging::error!(
                "(assert.fieldEquals) No field named '{}' on entity with type '{}' and id '{}' found.",
                &field_name,
                &entity_type,
                &id
            );

            return Ok(false);
        }

        let val = entity.get(&field_name).unwrap();
        if val.to_string() != expected_val {
            logging::error!(
                "(assert.fieldEquals) Expected field '{}' to equal '{}', but was '{}' instead.",
                &field_name,
                &expected_val,
                val
            );
            return Ok(false);
        };

        Ok(true)
    }

    /// function _assert.equals(expected: ethereum.Value, actual: ethereum.Value): bool
    pub fn assert_equals(
        &mut self,
        _gas: &GasCounter,
        expected_ptr: u32,
        actual_ptr: u32,
    ) -> Result<bool, HostExportError> {
        let expected: Token = self.resolve_asc_pointer(expected_ptr.into());
        let actual: Token = self.resolve_asc_pointer(actual_ptr.into());

        let exp_val = get_token_value(expected);
        let act_val = get_token_value(actual);

        if exp_val != act_val {
            logging::error!(
                "(assert.equals) Expected value was '{}' but actual value was '{}'",
                exp_val,
                act_val
            );
            return Ok(false);
        }

        Ok(true)
    }

    /// function _assert.notInStore(entityType: string, id: string): bool
    pub fn assert_not_in_store(
        &mut self,
        _gas: &GasCounter,
        entity_type_ptr: AscPtr<AscString>,
        id_ptr: AscPtr<AscString>,
    ) -> Result<bool, HostExportError> {
        let entity_type: String = self.resolve_asc_pointer(entity_type_ptr);
        let id: String = self.resolve_asc_pointer(id_ptr);

        if self.store.contains_key(&entity_type)
            && self.store.get(&entity_type).unwrap().contains_key(&id)
        {
            logging::error!(
                "(assert.notInStore) Value for entity type: '{}' and id: '{}' was found in store.",
                entity_type,
                id
            );
            return Ok(false);
        }

        Ok(true)
    }

    pub fn assert_data_source_count(
        &mut self,
        _gas: &GasCounter,
        template_name_ptr: AscPtr<AscString>,
        expected_count: u32,
    ) -> Result<bool, HostExportError> {
        let template_name: String = self.resolve_asc_pointer(template_name_ptr);

        if let Some(template) = self.templates.get(&template_name) {
            let actual_count = template.len() as u32;

            if actual_count != expected_count {
                logging::error!(
                    "(assert.dataSourceCount) Expected dataSource count for template `{}` to be '{}' but was '{}'",
                    template_name,
                    expected_count,
                    actual_count
                );

                return Ok(false);
            }
        } else {
            logging::error!(
                "(assert.dataSourceCoutn) No template with name '{}' found.",
                template_name
            );
            return Ok(false);
        }

        Ok(true)
    }

    pub fn assert_data_source_exists(
        &mut self,
        _gas: &GasCounter,
        template_name_ptr: AscPtr<AscString>,
        address_ptr: AscPtr<AscString>,
    ) -> Result<bool, HostExportError> {
        let template_name: String = self.resolve_asc_pointer(template_name_ptr);
        let address: String = self.resolve_asc_pointer(address_ptr);

        if let Some(template) = self.templates.get(&template_name) {
            if !template.contains_key(&address) {
                logging::error!(
                    "(assert.dataSourceExists) No dataSource with address '{}' found for template '{}'",
                    address,
                    template_name
                );
                return Ok(false);
            }
        } else {
            logging::error!(
                "(assert.dataSourceExists) No template with name '{}' found.",
                template_name
            );
            return Ok(false);
        }

        Ok(true)
    }

    /// Overloading the assert function with custom error message for backwards compatibility with matchstick-as

    /// function _assert.fieldEquals(
    ///     entityType: string, id: string,
    ///     fieldName: string, expectedVal: string,
    ///     message: string,
    /// ): bool
    pub fn assert_field_equals_with_message(
        &mut self,
        _gas: &GasCounter,
        entity_type_ptr: AscPtr<AscString>,
        id_ptr: AscPtr<AscString>,
        field_name_ptr: AscPtr<AscString>,
        expected_val_ptr: AscPtr<AscString>,
        message_ptr: AscPtr<AscString>,
    ) -> Result<bool, HostExportError> {
        let entity_type: String = self.resolve_asc_pointer(entity_type_ptr);
        let id: String = self.resolve_asc_pointer(id_ptr);
        let field_name: String = self.resolve_asc_pointer(field_name_ptr);
        let expected_val: String = self.resolve_asc_pointer(expected_val_ptr);
        let message: String = self.resolve_asc_pointer(message_ptr);

        if !self.store.contains_key(&entity_type) {
            logging::error!(
                "(assert.fieldEquals) No entities with type '{}' found.",
                &entity_type
            );

            return Ok(false);
        }

        let entities = self.store.get(&entity_type).unwrap();
        if !entities.contains_key(&id) {
            logging::error!(
                "(assert.fieldEquals) No entity with type '{}' and id '{}' found.",
                &entity_type,
                &id
            );

            return Ok(false);
        }

        let entity = entities.get(&id).unwrap();
        if !entity.contains_key(&field_name) {
            logging::error!(
                "(assert.fieldEquals) No field named '{}' on entity with type '{}' and id '{}' found.",
                &field_name,
                &entity_type,
                &id
            );

            return Ok(false);
        }

        let val = entity.get(&field_name).unwrap();
        if val.to_string() != expected_val {
            logging::error!("(assert.fieldEquals) {}", message);

            return Ok(false);
        };

        Ok(true)
    }

    /// function _assert.equals(expected: ethereum.Value, actual: ethereum.Value, message: string): bool
    pub fn assert_equals_with_message(
        &mut self,
        _gas: &GasCounter,
        expected_ptr: u32,
        actual_ptr: u32,
        message_ptr: AscPtr<AscString>,
    ) -> Result<bool, HostExportError> {
        let expected: Token = self.resolve_asc_pointer(expected_ptr.into());
        let actual: Token = self.resolve_asc_pointer(actual_ptr.into());
        let message: String = self.resolve_asc_pointer(message_ptr);

        let exp_val = get_token_value(expected);
        let act_val = get_token_value(actual);

        if exp_val != act_val {
            logging::error!("(assert.equals) {}", message);

            return Ok(false);
        }

        Ok(true)
    }

    /// function _assert.notInStore(entityType: string, id: string, message: string): bool
    pub fn assert_not_in_store_with_message(
        &mut self,
        _gas: &GasCounter,
        entity_type_ptr: AscPtr<AscString>,
        id_ptr: AscPtr<AscString>,
        message_ptr: AscPtr<AscString>,
    ) -> Result<bool, HostExportError> {
        let entity_type: String = self.resolve_asc_pointer(entity_type_ptr);
        let id: String = self.resolve_asc_pointer(id_ptr);
        let message: String = self.resolve_asc_pointer(message_ptr);

        if self.store.contains_key(&entity_type)
            && self.store.get(&entity_type).unwrap().contains_key(&id)
        {
            logging::error!("(assert.notInStore) {}", message);

            return Ok(false);
        }

        Ok(true)
    }

    pub fn assert_data_source_count_with_message(
        &mut self,
        _gas: &GasCounter,
        template_name_ptr: AscPtr<AscString>,
        expected_count: u32,
        message_ptr: AscPtr<AscString>,
    ) -> Result<bool, HostExportError> {
        let template_name: String = self.resolve_asc_pointer(template_name_ptr);
        let message: String = self.resolve_asc_pointer(message_ptr);

        if let Some(template) = self.templates.get(&template_name) {
            let actual_count = template.len() as u32;

            if actual_count != expected_count {
                logging::error!("(assert.dataSourceCount) {}", message);

                return Ok(false);
            }
        } else {
            logging::error!(
                "(assert.dataSourceCoutn) No template with name '{}' found.",
                template_name
            );
            return Ok(false);
        }

        Ok(true)
    }

    pub fn assert_data_source_exists_with_message(
        &mut self,
        _gas: &GasCounter,
        template_name_ptr: AscPtr<AscString>,
        address_ptr: AscPtr<AscString>,
        message_ptr: AscPtr<AscString>,
    ) -> Result<bool, HostExportError> {
        let template_name: String = self.resolve_asc_pointer(template_name_ptr);
        let address: String = self.resolve_asc_pointer(address_ptr);
        let message: String = self.resolve_asc_pointer(message_ptr);

        if let Some(template) = self.templates.get(&template_name) {
            if !template.contains_key(&address) {
                logging::error!("(assert.dataSourceExists) {}", message);
                return Ok(false);
            }
        } else {
            logging::error!(
                "(assert.dataSourceExists) No template with name '{}' found.",
                template_name
            );
            return Ok(false);
        }

        Ok(true)
    }

    fn get_store_entity(
        &mut self,
        scope: StoreScope,
        entity_type_ptr: AscPtr<AscString>,
        id_ptr: AscPtr<AscString>,
        _gas: &GasCounter,
    ) -> Result<AscPtr<AscEntity>, HostExportError> {
        let entity_type: String = self.resolve_asc_pointer(entity_type_ptr);
        let id: String = self.resolve_asc_pointer(id_ptr);

        let store = match scope {
            StoreScope::Global => &self.store,
            StoreScope::Cache => &self.cache_store,
        };

        let entity = store
            .get(&entity_type)
            .and_then(|entities| entities.get(&id));

        if let Some(entity) = entity {
            let res = self.create_asc_pointer(&entity.clone().to_entity());

            return Ok(res);
        }

        Ok(AscPtr::null())
    }

    fn load_related_entities(
        &mut self,
        entity_type: &String,
        entity_id: &String,
        entity_virtual_field: &String,
    ) -> Vec<StoreEntity> {
        let mut related_entities: Vec<StoreEntity> = Vec::new();

        // Gets the derived entity type and derived entity field associated with the parent entity
        let derived_from = self
            .derived
            .get(entity_type)
            .and_then(|fields| fields.get(entity_virtual_field));

        if let Some(entities) = derived_from {
            for (derived_from_entity_type, derived_from_entity_field) in entities.iter() {
                let derived_entities = self.store.get(derived_from_entity_type);

                if let Some(derived_entities) = derived_entities {
                    // loop through all derived entities from the store to find a relation with the parent entity
                    // if relation is found, it adds the whole entity to the related entities result
                    for (derived_entity_id, derived_entity) in derived_entities.iter() {
                        if !derived_entity.contains_key(derived_from_entity_field) {
                            continue;
                        }

                        // derived field value could be a single ID or list of IDs
                        let derived_field_value = derived_entity
                            .get(derived_from_entity_field)
                            .unwrap()
                            .clone();

                        // converts different value types(string, bytes, list) to a single vector
                        // that way it would be easier to find relation by entity id
                        let derived_entity_ids: Vec<Value> = match derived_field_value {
                            Value::Bytes(id) => vec![Value::from(id)],
                            Value::String(id) => vec![Value::from(id)],
                            Value::List(ids) => ids,
                            _ => vec![],
                        };

                        let relation_found: bool = derived_entity_ids
                            .iter()
                            .any(|derived_id| derived_id.to_string().eq(entity_id));

                        if relation_found {
                            related_entities
                                .push(derived_entities.get(derived_entity_id).unwrap().clone());
                        }
                    }
                }
            }
        }

        related_entities
    }

    /// function store.loadRelated(entity: string, id: string, field: string): Array<Entity>;
    pub fn mock_store_load_related(
        &mut self,
        _gas: &GasCounter,
        entity_type_ptr: AscPtr<AscString>,
        entity_id_ptr: AscPtr<AscString>,
        entity_virtual_field_ptr: AscPtr<AscString>,
    ) -> Result<AscPtr<Array<AscPtr<AscEntity>>>, HostExportError> {
        let entity_type: String = self.resolve_asc_pointer(entity_type_ptr);
        let entity_id: String = self.resolve_asc_pointer(entity_id_ptr);
        let entity_virtual_field: String = self.resolve_asc_pointer(entity_virtual_field_ptr);

        let related_entities: Vec<Entity> = self
            .load_related_entities(&entity_type, &entity_id, &entity_virtual_field)
            // convert to Entity
            .into_iter()
            .map(|mut v: StoreEntity| v.to_entity())
            .collect();

        let related_entities_ptr: AscPtr<Array<AscPtr<AscEntity>>> =
            self.create_asc_pointer(&related_entities);

        Ok(related_entities_ptr)
    }

    /// function store.get(entityType: string, id: string): Entity
    pub fn mock_store_get(
        &mut self,
        _gas: &GasCounter,
        entity_type_ptr: AscPtr<AscString>,
        id_ptr: AscPtr<AscString>,
    ) -> Result<AscPtr<AscEntity>, HostExportError> {
        self.get_store_entity(StoreScope::Global, entity_type_ptr, id_ptr, _gas)
    }

    /// function store.getInBlock(entityType: string, id: string): Entity
    pub fn mock_store_get_in_block(
        &mut self,
        _gas: &GasCounter,
        entity_type_ptr: AscPtr<AscString>,
        id_ptr: AscPtr<AscString>,
    ) -> Result<AscPtr<AscEntity>, HostExportError> {
        self.get_store_entity(StoreScope::Cache, entity_type_ptr, id_ptr, _gas)
    }

    fn update_store(
        &mut self,
        scope: StoreScope,
        entity_type_ptr: AscPtr<AscString>,
        id_ptr: AscPtr<AscString>,
        data_ptr: AscPtr<AscEntity>,
        _gas: &GasCounter,
    ) -> Result<(), HostExportError> {
        let entity_type: String = self.resolve_asc_pointer(entity_type_ptr);
        let id: String = self.resolve_asc_pointer(id_ptr);
        let data: StoreEntity = self.resolve_asc_pointer(data_ptr);

        let required_fields = get_entity_required_fields(self, entity_type.clone());

        for f in required_fields {
            if !data.contains_key(&f.name) {
                return Err(anyhow!(
                    "Missing value for non-nullable field '{}' for an entity of type '{}'.",
                    f.name,
                    entity_type,
                )
                .into());
            } else if let Value::Null = data.get(&f.name).unwrap() {
                return Err(anyhow!(
                    "The required field '{}' for an entity of type '{}' is null.",
                    f.name,
                    entity_type,
                )
                .into());
            }
        }

        let store = match scope {
            StoreScope::Global => &mut self.store,
            StoreScope::Cache => &mut self.cache_store,
        };

        let mut entity_type_store = if store.contains_key(&entity_type) {
            store.get(&entity_type).unwrap().clone()
        } else {
            HashMap::new()
        };

        entity_type_store.insert(id, data);

        store.insert(entity_type, entity_type_store);

        Ok(())
    }

    /// function store.set(entityType: string, id: string, data: map): void
    pub fn mock_store_set(
        &mut self,
        _gas: &GasCounter,
        entity_type_ptr: AscPtr<AscString>,
        id_ptr: AscPtr<AscString>,
        data_ptr: AscPtr<AscEntity>,
    ) -> Result<(), HostExportError> {
        self.update_store(StoreScope::Global, entity_type_ptr, id_ptr, data_ptr, _gas)
    }

    /// function mockInBlockStore(entityType: string, id: string, data: map): void
    pub fn cache_store_set(
        &mut self,
        _gas: &GasCounter,
        entity_type_ptr: AscPtr<AscString>,
        id_ptr: AscPtr<AscString>,
        data_ptr: AscPtr<AscEntity>,
    ) -> Result<(), HostExportError> {
        self.update_store(StoreScope::Cache, entity_type_ptr, id_ptr, data_ptr, _gas)
    }

    /// function store.remove(entityType: string, id: string): void
    pub fn mock_store_remove(
        &mut self,
        _gas: &GasCounter,
        entity_type_ptr: AscPtr<AscString>,
        id_ptr: AscPtr<AscString>,
    ) -> Result<(), HostExportError> {
        let entity_type: String = self.resolve_asc_pointer(entity_type_ptr);
        let id: String = self.resolve_asc_pointer(id_ptr);

        if self.store.contains_key(&entity_type)
            && self.store.get(&entity_type).unwrap().contains_key(&id)
        {
            let mut entity_type_store = self.store.get(&entity_type).unwrap().clone();
            entity_type_store.remove(&id);

            self.store.insert(entity_type, entity_type_store);
        } else {
            return Err(anyhow!(
                "(store.remove) Entity with type '{}' and id '{}' does not exist.",
                &entity_type,
                &id
            )
            .into());
        }

        Ok(())
    }

    /// function ethereum.call(call: SmartContractCall): Array<Value> | null
    pub fn ethereum_call(
        &mut self,
        _gas: &GasCounter,
        contract_call_ptr: u32,
    ) -> Result<AscEnumArray<EthereumValueKind>, HostExportError> {
        let call: UnresolvedContractCall = self
            .resolve_asc_pointer::<_, AscUnresolvedContractCall_0_0_4>(contract_call_ptr.into());

        let contract_address = call.contract_address.to_string();
        let fn_name = call.function_name.to_string();
        let fn_signature = call
            .function_signature
            .unwrap_or_else(|| logging::critical!("Could not get function signature."));
        let fn_args = call.function_args;

        let fn_id = MatchstickInstanceContext::<C>::fn_id(
            &contract_address,
            &fn_name,
            &fn_signature,
            &fn_args,
        );

        let return_val;
        if self.fn_ret_map.contains_key(&fn_id) {
            let func: Vec<Token> = self.fn_ret_map.get(&fn_id).unwrap().clone();
            if *func == REVERTS_IDENTIFIER.clone() {
                return Ok(AscPtr::null());
            }

            return_val = self.create_asc_pointer(func.as_slice());

            Ok(return_val)
        } else {
            Err(anyhow!(
                "Could not find a mocked function with the following parameters, address: {}, name: {}, signature {}, params: {:?}.",
                &contract_address,
                &fn_name,
                &fn_signature,
                &fn_args
            ).into())
        }
    }

    /// function mockFunction(
    ///     contractAddress: Address, fnName: string, fnSignature: string,
    ///     fnArgs: ethereum.Value[], returnValue: ethereum.Value[], reverts: bool,
    /// ): void
    #[allow(clippy::too_many_arguments)]
    pub fn mock_function(
        &mut self,
        _gas: &GasCounter,
        contract_address_ptr: u32,
        fn_name_ptr: AscPtr<AscString>,
        fn_signature_ptr: AscPtr<AscString>,
        fn_args_ptr: u32,
        return_value_ptr: u32,
        reverts_ptr: AscPtr<bool>,
    ) -> Result<(), HostExportError> {
        let contract_address: Address = self.resolve_asc_pointer(contract_address_ptr.into());
        let fn_name: String = self.resolve_asc_pointer(fn_name_ptr);
        let fn_signature: String = self.resolve_asc_pointer(fn_signature_ptr);
        let fn_args: Vec<Token> = self.resolve_asc_pointer(fn_args_ptr.into());
        let return_value: Vec<Token> = self.resolve_asc_pointer(return_value_ptr.into());
        let reverts = bool::from(EnumPayload(reverts_ptr.to_payload()));

        // Extracts the arguments part from the function signature
        // e.g "fnName(int32, string, address)" -> "int32, string, address"
        // and then calls `collect_types` to split the result into a Vec
        let tmp_str = fn_signature.replace(&(fn_name.clone() + "("), "");
        let components: Vec<&str> = tmp_str.split("):").collect();
        let tmp_args_str = components[0];
        let arg_types: Vec<String> = collect_types(tmp_args_str);

        let fn_signature_split: Vec<&str> = fn_signature.split('(').collect();
        if fn_name != fn_signature_split[0] {
            return Err(anyhow!(
                "createMockedFunction: function name `{}` should match the name in the function signature `{}`",
                fn_name,
                fn_signature
            ).into());
        }

        // Checks if the count of the passed arguments matches the count of expected arguments
        if arg_types.len() != fn_args.len() {
            return Err(anyhow!(
                "{} expected {} arguments, but received {}",
                fn_name,
                arg_types.len(),
                fn_args.len()
            )
            .into());
        }

        // Validates that every passed argument matches the type of the expected argument
        // from the function signature. Panics if there is a mismatch and informs the user
        // of the position and the expected and recieved type
        for (index, (arg_type, fn_arg)) in arg_types.iter().zip(fn_args.iter()).enumerate() {
            let param_type = get_kind(arg_type.to_owned());

            if !fn_arg.type_check(&param_type) {
                return Err(anyhow!(
                    "createMockedFunction `{}` parameters mismatch at position {}:\nExpected: {:?}\nRecieved: {:?}\n",
                    fn_name,
                    index + 1,
                    param_type,
                    fn_arg
                ).into());
            }
        }

        let fn_id = MatchstickInstanceContext::<C>::fn_id(
            &contract_address.to_string(),
            &fn_name,
            &fn_signature,
            &fn_args,
        );

        if reverts {
            self.fn_ret_map.insert(fn_id, REVERTS_IDENTIFIER.clone());
        } else {
            self.fn_ret_map.insert(fn_id, return_value);
        }

        Ok(())
    }

    /// function dataSource.create(name: string, params: Array<string>): void
    pub fn mock_data_source_create(
        &mut self,
        _gas: &GasCounter,
        name_ptr: AscPtr<AscString>,
        params_ptr: AscPtr<Array<AscPtr<AscString>>>,
    ) -> Result<(), HostExportError> {
        let name: String = self.resolve_asc_pointer(name_ptr);
        let params: Vec<String> = self.resolve_asc_pointer(params_ptr);

        data_source_create(name, params, None, self)
    }

    /// function dataSource.createWithContext(
    ///     name: string, params: Array<string>,
    ///     context: DataSourceContext,
    /// ): void
    pub fn mock_data_source_create_with_context(
        &mut self,
        _gas: &GasCounter,
        name_ptr: AscPtr<AscString>,
        params_ptr: AscPtr<Array<AscPtr<AscString>>>,
        context_ptr: AscPtr<AscEntity>,
    ) -> Result<(), HostExportError> {
        let name: String = self.resolve_asc_pointer(name_ptr);
        let params: Vec<String> = self.resolve_asc_pointer(params_ptr);
        let context: HashMap<Word, Value> = self.resolve_asc_pointer(context_ptr);

        let context = DataSourceContext::from(context);

        data_source_create(name, params, Some(context), self)
    }

    /// function dataSource.address(): Address
    pub fn mock_data_source_address(
        &mut self,
        _gas: &GasCounter,
    ) -> Result<AscPtr<Uint8Array>, HostExportError> {
        let default_address_val = "0x0000000000000000000000000000000000000000";

        let result = match self.data_source_return_value.0.clone() {
            Some(value) => {
                let eth_address = Address::from_str(&value).unwrap_or_default();
                // checks whether the value is a valid ethereum address and parses it
                // otherwise it is considered as ipfs cid
                // Zero address is considered as valid only if matches the mocked value
                if !eth_address.is_zero() || value.eq(default_address_val) {
                    self.create_asc_pointer(&eth_address)
                } else {
                    self.create_asc_pointer(value.as_bytes())
                }
            }
            None => {
                logging::error!(
                    "No mocked Eth address or Ipfs CID found, so fallback to Eth Zero address"
                );
                self.create_asc_pointer(
                    &Address::from_str(default_address_val).expect("Couldn't create address"),
                )
            }
        };

        Ok(result)
    }

    /// function dataSource.network(): String
    pub fn mock_data_source_network(
        &mut self,
        _gas: &GasCounter,
    ) -> Result<AscPtr<AscString>, HostExportError> {
        let default_network_val = "mainnet";
        let result = match &self.data_source_return_value.1 {
            Some(value) => AscPtr::alloc_obj(
                asc_string_from_str(&value.clone()),
                &mut self.wasm_ctx,
                &GasCounter::new(),
            )
            .expect("Couldn't create pointer."),
            None => AscPtr::alloc_obj(
                asc_string_from_str(default_network_val),
                &mut self.wasm_ctx,
                &GasCounter::new(),
            )
            .expect("Couldn't create pointer."),
        };

        Ok(result)
    }

    /// function dataSource.context(): DataSourceContext
    pub fn mock_data_source_context(
        &mut self,
        _gas: &GasCounter,
    ) -> Result<AscPtr<AscEntity>, HostExportError> {
        let default_context_val: Entity = Vec::new();
        let result = match &self.data_source_return_value.2 {
            Some(value) => {
                let entity: Entity = value.clone().to_entity();

                self.create_asc_pointer(&entity)
            }
            None => self.create_asc_pointer(&default_context_val),
        };

        Ok(result)
    }

    /// function dataSourceMock.setReturnValues(address: String, network: String, context: DataSourceContext): void
    pub fn set_data_source_return_values(
        &mut self,
        _gas: &GasCounter,
        address_ptr: AscPtr<AscString>,
        network_ptr: AscPtr<AscString>,
        context_ptr: AscPtr<AscEntity>,
    ) -> Result<(), HostExportError> {
        let address: String = self.resolve_asc_pointer(address_ptr);
        let network: String = self.resolve_asc_pointer(network_ptr);
        let context: HashMap<String, Value> = self.resolve_asc_pointer(context_ptr);

        self.data_source_return_value = (Some(address), Some(network), Some(context));
        Ok(())
    }

    /// function countEntities(entityType: string): i32
    pub fn count_entities(
        &mut self,
        _gas: &GasCounter,
        entity_type_ptr: AscPtr<AscString>,
    ) -> Result<i32, HostExportError> {
        let entity_type: String = self.resolve_asc_pointer(entity_type_ptr);

        match self.store.get(&entity_type) {
            Some(inner_map) => Ok(inner_map.len().try_into().unwrap_or_else(|err| {
                logging::critical!(
                    "Couldn't cast usize value: {} into i32.\n{}",
                    inner_map.len(),
                    err
                )
            })),
            None => Ok(0),
        }
    }

    ///  function readFile(path: string): Bytes
    pub fn read_file(
        &mut self,
        _gas: &GasCounter,
        file_path_ptr: AscPtr<AscString>,
    ) -> Result<AscPtr<Uint8Array>, HostExportError> {
        let file_path: String = self.resolve_asc_pointer(file_path_ptr);

        let string = std::fs::read_to_string(&file_path).unwrap_or_else(|err| {
            logging::critical!("Failed to read file `{}` with error: {}", &file_path, err)
        });
        let result = self.create_asc_pointer(string.as_bytes());

        Ok(result)
    }

    /// function mockIpfsFile(hash: string, file_path: string): void
    pub fn mock_ipfs_file(
        &mut self,
        _gas: &GasCounter,
        hash_ptr: AscPtr<AscString>,
        file_path_ptr: AscPtr<AscString>,
    ) -> Result<(), HostExportError> {
        let hash: String = self.resolve_asc_pointer(hash_ptr);
        let file_path: String = self.resolve_asc_pointer(file_path_ptr);

        self.ipfs.insert(hash, file_path);
        Ok(())
    }

    /// function ipfs.cat(hash: string): Bytes | null
    pub fn mock_ipfs_cat(
        &mut self,
        _gas: &GasCounter,
        hash_ptr: AscPtr<AscString>,
    ) -> Result<AscPtr<Uint8Array>, HostExportError> {
        let hash: String = self.resolve_asc_pointer(hash_ptr);
        let file_path = &self
            .ipfs
            .get(&hash)
            .unwrap_or_else(|| logging::critical!("IPFS file `{}` not found", hash));
        let string = std::fs::read_to_string(file_path).unwrap_or_else(|err| {
            logging::critical!("Failed to read file `{}` with error: {}", &file_path, err)
        });
        let result = self.create_asc_pointer(string.as_bytes());

        Ok(result)
    }

    /// function ipfs.map(link: string, callback: string, user_data: Value, flags: Array<string>): void
    pub fn mock_ipfs_map(
        &mut self,
        _gas: &GasCounter,
        link_ptr: AscPtr<AscString>,
        callback_ptr: AscPtr<AscString>,
        user_data_ptr: AscPtr<AscEnum<StoreValueKind>>,
        _flags_ptr: AscPtr<Array<AscPtr<AscString>>>,
    ) -> Result<(), HostExportError> {
        let link: String = self.resolve_asc_pointer(link_ptr);
        let callback: String = self.resolve_asc_pointer(callback_ptr);
        let user_data: Value = self.resolve_asc_pointer(user_data_ptr);

        let file_path = &self
            .ipfs
            .get(&link)
            .unwrap_or_else(|| logging::critical!("IPFS file `{}` not found", link));
        let data = std::fs::read_to_string(file_path).unwrap_or_else(|err| {
            logging::critical!("Failed to read file `{}` with error: {}", file_path, err)
        });
        let json_values: Vec<serde_json::Value> = serde_json::from_str(&data).unwrap();

        let host_metrics = &self.wasm_ctx.host_metrics.clone();
        let valid_module = &self.wasm_ctx.valid_module.clone();
        let ctx = &self.wasm_ctx.ctx.derive_with_empty_block_state();
        let experimental_features = ExperimentalFeatures {
            allow_non_deterministic_ipfs: true,
        };

        let instance = crate::MatchstickInstance::<C>::from_valid_module_with_ctx(
            valid_module.clone(),
            ctx.derive_with_empty_block_state(),
            host_metrics.clone(),
            None,
            experimental_features,
        )
        .unwrap();

        let data_ptr = instance.instance_ctx_mut().create_asc_pointer(&user_data);

        for value in json_values {
            let value_ptr = instance.instance_ctx_mut().create_asc_pointer(&value);

            instance.instance_ctx_mut().store = self.store.clone();
            instance.instance_ctx_mut().fn_ret_map = self.fn_ret_map.clone();
            instance.instance_ctx_mut().data_source_return_value =
                self.data_source_return_value.clone();

            instance
                .instance
                .get_func(&callback)
                .with_context(|| format!("function {} not found", &callback))?
                .typed()?
                .call((value_ptr.wasm_ptr(), data_ptr.wasm_ptr()))
                .with_context(|| format!("Failed to handle callback '{}'", &callback))?;

            self.store = instance.instance_ctx().store.clone();
            self.fn_ret_map = instance.instance_ctx().fn_ret_map.clone();
            self.data_source_return_value =
                instance.instance_ctx().data_source_return_value.clone();
        }

        Ok(())
    }
}

pub fn asc_string_from_str(initial_string: &str) -> AscString {
    let utf_16_iterator = initial_string.encode_utf16();
    let mut u16_vector = vec![];
    utf_16_iterator.for_each(|element| u16_vector.push(element));
    let version = Version::new(0, 0, 6);
    AscString::new(&u16_vector, version).expect("Couldn't create AscString.")
}
