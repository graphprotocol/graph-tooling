#[cfg(test)]
mod tests {
    use std::collections::HashMap;
    use std::path::PathBuf;
    use std::str::FromStr;

    use graph::{
        data::store::Value,
        prelude::ethabi::{Address, Token},
        runtime::{asc_get, asc_new, gas::GasCounter, AscPtr, AscType},
    };
    use graph_chain_ethereum::{runtime::abi::AscUnresolvedContractCall_0_0_4, Chain};
    use graph_runtime_wasm::asc_abi::class::{
        Array, AscEntity, AscEnum, AscString, AscTypedMap, AscTypedMapEntry, EnumPayload,
        EthereumValueKind, StoreValueKind, TypedArray,
    };
    use serial_test::serial;

    use crate::{
        context::{asc_string_from_str, MatchstickInstanceContext, REVERTS_IDENTIFIER},
        logging::{accum, flush, LOGS},
        {MatchstickInstance, MANIFEST_LOCATION, SCHEMA_LOCATION},
    };

    fn get_context() -> MatchstickInstanceContext<Chain> {
        SCHEMA_LOCATION.with(|path| *path.borrow_mut() = PathBuf::from("./mocks/schema.graphql"));

        MANIFEST_LOCATION.with(|path| {
            *path.borrow_mut() = PathBuf::from("./mocks/yamls/subgraph.yaml");
        });

        let module = <MatchstickInstance<Chain>>::new("./mocks/wasm/gravity.wasm");

        module
            .instance_ctx
            .take()
            .expect("Couldn't get context from module.")
    }

    #[test]
    #[serial]
    fn log_basic_test() {
        let mut context = get_context();

        let message = asc_string_from_str("log message");
        let pointer = AscPtr::alloc_obj(message, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");

        accum();
        context
            .log(&GasCounter::new(), 3, pointer)
            .expect("Couldn't call log.");

        unsafe {
            assert_eq!(LOGS.len(), 1);
            assert!(LOGS.pop().unwrap().contains("log message"));
            flush();
        }
    }

    #[test]
    #[serial]
    #[should_panic(expected = "🆘")]
    fn log_panic_test() {
        let mut context = get_context();

        let message = asc_string_from_str("log message");
        let pointer = AscPtr::alloc_obj(message, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");

        context
            .log(&GasCounter::new(), 0, pointer)
            .expect("Couldn't call log.");
    }

    #[test]
    #[serial]
    fn clear_store_basic_test() {
        let mut context = get_context();

        context.store.insert("type".to_owned(), HashMap::new());

        context
            .clear_store(&GasCounter::new())
            .expect("Couldn't call clear_store");

        assert_eq!(context.store.len(), 0);
    }

    #[test]
    #[serial]
    fn clear_cache_store_basic_test() {
        let mut context = get_context();

        context
            .cache_store
            .insert("type".to_owned(), HashMap::new());

        context
            .clear_cache_store(&GasCounter::new())
            .expect("Couldn't call clear_store");

        assert_eq!(context.cache_store.len(), 0);
    }

    #[test]
    #[serial]
    fn register_test_basic_test() {
        let mut context = get_context();

        context.meta_tests = vec![];
        let initial_asc_string = asc_string_from_str("test");
        let name_ptr = AscPtr::alloc_obj(
            initial_asc_string,
            &mut context.wasm_ctx,
            &GasCounter::new(),
        )
        .expect("Couldn't unwrap pointer.");
        let should_throw_ptr = AscPtr::new(0);

        context
            .register_test(&GasCounter::new(), name_ptr, should_throw_ptr, 0)
            .expect("Couldn't call register_test.");

        assert_eq!(context.meta_tests.len(), 1);
        assert_eq!(context.meta_tests[0].0, "test");
        assert!(!context.meta_tests[0].1);
        assert_eq!(context.meta_tests[0].2, 0);
    }

    #[test]
    #[serial]
    fn assert_field_equals_basic_test() {
        let mut context = get_context();

        let entity_string = asc_string_from_str("entity");
        let id_string = asc_string_from_str("id");
        let field_name_string = asc_string_from_str("field_name");
        let expected_val_string = asc_string_from_str("val");
        let entity_ptr =
            AscPtr::alloc_obj(entity_string, &mut context.wasm_ctx, &GasCounter::new())
                .expect("Couldn't create pointer.");
        let id_ptr = AscPtr::alloc_obj(id_string, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");
        let field_name_ptr =
            AscPtr::alloc_obj(field_name_string, &mut context.wasm_ctx, &GasCounter::new())
                .expect("Couldn't create pointer.");
        let expected_val_ptr = AscPtr::alloc_obj(
            expected_val_string,
            &mut context.wasm_ctx,
            &GasCounter::new(),
        )
        .expect("Couldn't create pointer.");

        context.store.insert("entity".to_owned(), HashMap::new());
        let mut inner_map = context
            .store
            .get("entity")
            .expect("Couldn't get inner map.")
            .clone();
        inner_map.insert("id".to_owned(), HashMap::new());
        let mut entity = inner_map
            .get("id")
            .expect("Couldn't get value from inner map.")
            .clone();
        entity.insert("field_name".to_owned(), Value::String("val".to_owned()));
        inner_map.insert("id".to_owned(), entity);
        context.store.insert("entity".to_owned(), inner_map);

        let result = context
            .assert_field_equals(
                &GasCounter::new(),
                entity_ptr,
                id_ptr,
                field_name_ptr,
                expected_val_ptr,
            )
            .expect("Couldn't call assert_field_equals.");

        assert!(result);
    }

    #[test]
    #[serial]
    fn assert_field_equals_failing_variants() {
        let mut context = get_context();

        let entity_string = asc_string_from_str("entity");
        let id_string = asc_string_from_str("id");
        let field_name_string = asc_string_from_str("field_name");
        let expected_val_string = asc_string_from_str("val");
        let entity_ptr =
            AscPtr::alloc_obj(entity_string, &mut context.wasm_ctx, &GasCounter::new())
                .expect("Couldn't create pointer.");
        let id_ptr = AscPtr::alloc_obj(id_string, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");
        let field_name_ptr =
            AscPtr::alloc_obj(field_name_string, &mut context.wasm_ctx, &GasCounter::new())
                .expect("Couldn't create pointer.");
        let expected_val_ptr = AscPtr::alloc_obj(
            expected_val_string,
            &mut context.wasm_ctx,
            &GasCounter::new(),
        )
        .expect("Couldn't create pointer.");

        let mut result = context
            .assert_field_equals(
                &GasCounter::new(),
                entity_ptr,
                id_ptr,
                field_name_ptr,
                expected_val_ptr,
            )
            .expect("Couldn't call assert_field_equals.");

        assert!(!result);

        context.store.insert("entity".to_owned(), HashMap::new());

        result = context
            .assert_field_equals(
                &GasCounter::new(),
                entity_ptr,
                id_ptr,
                field_name_ptr,
                expected_val_ptr,
            )
            .expect("Couldn't call assert_field_equals.");

        assert!(!result);

        let mut inner_map = context
            .store
            .get("entity")
            .expect("Couldn't get inner map.")
            .clone();
        inner_map.insert("id".to_owned(), HashMap::new());
        context.store.insert("entity".to_owned(), inner_map);

        result = context
            .assert_field_equals(
                &GasCounter::new(),
                entity_ptr,
                id_ptr,
                field_name_ptr,
                expected_val_ptr,
            )
            .expect("Couldn't call assert_field_equals.");

        assert!(!result);

        let mut inner_map = context
            .store
            .get("entity")
            .expect("Couldn't get inner map.")
            .clone();
        let mut entity = inner_map
            .get("id")
            .expect("Couldn't get value from inner map.")
            .clone();
        entity.insert("field_name".to_owned(), Value::Null);
        inner_map.insert("id".to_owned(), entity);
        context.store.insert("entity".to_owned(), inner_map);

        result = context
            .assert_field_equals(
                &GasCounter::new(),
                entity_ptr,
                id_ptr,
                field_name_ptr,
                expected_val_ptr,
            )
            .expect("Couldn't call assert_field_equals.");

        assert!(!result);
    }

    #[test]
    #[serial]
    fn assert_equals_basic_test() {
        let mut context = get_context();

        let val = asc_string_from_str("val");
        let val_ptr = AscPtr::alloc_obj(val, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");

        let asc_enum = AscEnum::<EthereumValueKind> {
            kind: EthereumValueKind::String,
            _padding: 0,
            payload: EnumPayload::from(val_ptr),
        };
        let pointer = AscPtr::alloc_obj(asc_enum, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");

        let result = context
            .assert_equals(&GasCounter::new(), pointer.wasm_ptr(), pointer.wasm_ptr())
            .expect("Couldn't call assert_equals.");

        assert!(result);
    }

    #[test]
    #[serial]
    fn assert_equals_inequality() {
        let mut context = get_context();

        let val = asc_string_from_str("val");
        let val1 = asc_string_from_str("val1");

        let val_ptr = AscPtr::alloc_obj(val, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");
        let val1_ptr = AscPtr::alloc_obj(val1, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");

        let asc_enum = AscEnum::<EthereumValueKind> {
            kind: EthereumValueKind::String,
            _padding: 0,
            payload: EnumPayload::from(val_ptr),
        };
        let asc_enum1 = AscEnum::<EthereumValueKind> {
            kind: EthereumValueKind::String,
            _padding: 0,
            payload: EnumPayload::from(val1_ptr),
        };

        let pointer = AscPtr::alloc_obj(asc_enum, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");
        let pointer1 = AscPtr::alloc_obj(asc_enum1, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");

        let result = context
            .assert_equals(&GasCounter::new(), pointer.wasm_ptr(), pointer1.wasm_ptr())
            .expect("Couldn't call assert_equals.");

        assert!(!result);
    }

    #[test]
    #[serial]
    fn assert_not_in_store_basic_test() {
        let mut context = get_context();

        let entity_type = asc_string_from_str("entity_type");
        let id = asc_string_from_str("id");

        let entity_type_ptr =
            AscPtr::alloc_obj(entity_type, &mut context.wasm_ctx, &GasCounter::new())
                .expect("Couldn't create pointer.");
        let id_ptr = AscPtr::alloc_obj(id, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");

        let result = context
            .assert_not_in_store(&GasCounter::new(), entity_type_ptr, id_ptr)
            .expect("Couldn't call assert_not_in_store.");

        assert!(result);
    }

    #[test]
    #[serial]
    fn assert_not_in_store_when_in_store() {
        let mut context = get_context();

        context
            .store
            .insert("entity_type".to_owned(), HashMap::new());
        let mut inner_map = context
            .store
            .get("entity_type")
            .expect("Couldn't get inner map.")
            .clone();
        inner_map.insert("id".to_owned(), HashMap::new());
        context.store.insert("entity_type".to_owned(), inner_map);

        let entity_type = asc_string_from_str("entity_type");
        let id = asc_string_from_str("id");

        let entity_type_ptr =
            AscPtr::alloc_obj(entity_type, &mut context.wasm_ctx, &GasCounter::new())
                .expect("Couldn't create pointer.");
        let id_ptr = AscPtr::alloc_obj(id, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");

        let result = context
            .assert_not_in_store(&GasCounter::new(), entity_type_ptr, id_ptr)
            .expect("Couldn't call assert_not_in_store.");

        assert!(!result);
    }

    #[test]
    #[serial]
    fn mock_store_get_basic_test() {
        let mut context = get_context();

        context.store.insert("entity".to_owned(), HashMap::new());
        let mut inner_map = context
            .store
            .get("entity")
            .expect("Couldn't get inner map.")
            .clone();
        inner_map.insert("id".to_owned(), HashMap::new());
        let mut entity = inner_map
            .get("id")
            .expect("Couldn't get value from inner map.")
            .clone();
        entity.insert("field_name".to_owned(), Value::String("val".to_owned()));
        inner_map.insert("id".to_owned(), entity);
        context.store.insert("entity".to_owned(), inner_map);

        let entity = asc_string_from_str("entity");
        let id = asc_string_from_str("id");
        let entity_pointer = AscPtr::alloc_obj(entity, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");
        let id_pointer = AscPtr::alloc_obj(id, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");

        let value = context
            .mock_store_get(&GasCounter::new(), entity_pointer, id_pointer)
            .expect("Couldn't call mock_store_get.");

        assert_eq!(
            value
                .read_ptr(&context.wasm_ctx, &GasCounter::new())
                .unwrap()
                .content_len(
                    &value
                        .read_ptr(&context.wasm_ctx, &GasCounter::new())
                        .unwrap()
                        .to_asc_bytes()
                        .expect("Couldn't get entity bytes.")
                ),
            4
        );
    }

    #[test]
    #[serial]
    fn mock_store_get_no_such_entity() {
        let mut context = get_context();

        let entity = asc_string_from_str("entity");
        let id = asc_string_from_str("id");
        let entity_pointer = AscPtr::alloc_obj(entity, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");
        let id_pointer = AscPtr::alloc_obj(id, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");

        let value = context
            .mock_store_get(&GasCounter::new(), entity_pointer, id_pointer)
            .expect("Couldn't call mock_store_get.");

        assert!(value.is_null());
    }

    #[test]
    #[serial]
    fn mock_store_get_in_block_basic_test() {
        let mut context = get_context();

        context
            .cache_store
            .insert("entity".to_owned(), HashMap::new());
        let mut inner_map = context
            .cache_store
            .get("entity")
            .expect("Couldn't get inner map.")
            .clone();
        inner_map.insert("id".to_owned(), HashMap::new());
        let mut entity = inner_map
            .get("id")
            .expect("Couldn't get value from inner map.")
            .clone();
        entity.insert("field_name".to_owned(), Value::String("val".to_owned()));
        inner_map.insert("id".to_owned(), entity);
        context.cache_store.insert("entity".to_owned(), inner_map);

        let entity = asc_string_from_str("entity");
        let id = asc_string_from_str("id");
        let entity_pointer = AscPtr::alloc_obj(entity, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");
        let id_pointer = AscPtr::alloc_obj(id, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");

        let value = context
            .mock_store_get_in_block(&GasCounter::new(), entity_pointer, id_pointer)
            .expect("Couldn't call mock_store_get.");

        assert_eq!(
            value
                .read_ptr(&context.wasm_ctx, &GasCounter::new())
                .unwrap()
                .content_len(
                    &value
                        .read_ptr(&context.wasm_ctx, &GasCounter::new())
                        .unwrap()
                        .to_asc_bytes()
                        .expect("Couldn't get entity bytes.")
                ),
            4
        );
    }

    #[test]
    #[serial]
    fn mock_store_get_in_block_no_such_entity() {
        let mut context = get_context();

        let entity = asc_string_from_str("entity");
        let id = asc_string_from_str("id");
        let entity_pointer = AscPtr::alloc_obj(entity, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");
        let id_pointer = AscPtr::alloc_obj(id, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");

        let value = context
            .mock_store_get_in_block(&GasCounter::new(), entity_pointer, id_pointer)
            .expect("Couldn't call mock_store_get.");

        assert!(value.is_null());
    }

    fn prepare_entity_store_pointers(
        context: &mut MatchstickInstanceContext<Chain>,
    ) -> (
        AscPtr<AscString>,
        AscPtr<AscString>,
        AscPtr<AscTypedMap<AscString, AscEnum<StoreValueKind>>>,
    ) {
        let entity = asc_string_from_str("entity");
        let id = asc_string_from_str("id");
        let entity_pointer = AscPtr::alloc_obj(entity, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");
        let id_pointer = AscPtr::alloc_obj(id, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");
        let payload = AscEnum::<StoreValueKind> {
            kind: StoreValueKind::String,
            _padding: 0,
            payload: EnumPayload::from(id_pointer),
        };
        let payload_pointer = AscPtr::alloc_obj(payload, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");
        let map_entry = AscTypedMapEntry {
            key: id_pointer,
            value: payload_pointer,
        };
        let map_entry_pointer =
            AscPtr::alloc_obj(map_entry, &mut context.wasm_ctx, &GasCounter::new())
                .expect("Couldn't create pointer.");
        let asc_map = AscTypedMap {
            entries: AscPtr::alloc_obj(
                Array::new(
                    &[map_entry_pointer],
                    &mut context.wasm_ctx,
                    &GasCounter::new(),
                )
                .expect("Couldn't create Array."),
                &mut context.wasm_ctx,
                &GasCounter::new(),
            )
            .expect("Couldn't create pointer."),
        };
        let asc_map_pointer = AscPtr::alloc_obj(asc_map, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");

        return (entity_pointer, id_pointer, asc_map_pointer);
    }

    #[test]
    #[serial]
    fn mock_store_set_basic_test() {
        let mut context = get_context();

        let (entity_pointer, id_pointer, asc_map_pointer) =
            prepare_entity_store_pointers(&mut context);

        context
            .mock_store_set(
                &GasCounter::new(),
                entity_pointer,
                id_pointer,
                asc_map_pointer,
            )
            .expect("Couldn't call mock_store_set.");

        let inner_map = context
            .store
            .get("entity")
            .expect("Couldn't get inner map.");
        assert_eq!(inner_map.len(), 1);
    }

    #[test]
    #[serial]
    fn mock_store_set_existing_entity_type() {
        let mut context = get_context();

        let (entity_pointer, id_pointer, asc_map_pointer) =
            prepare_entity_store_pointers(&mut context);

        context.store.insert("entity".to_owned(), HashMap::new());
        let mut inner_map = context
            .store
            .get("entity")
            .expect("Couldn't get inner map.")
            .clone();
        inner_map.insert("another_id".to_owned(), HashMap::new());
        context.store.insert("entity".to_owned(), inner_map);

        context
            .mock_store_set(
                &GasCounter::new(),
                entity_pointer,
                id_pointer,
                asc_map_pointer,
            )
            .expect("Couldn't call mock_store_get.");

        let inner_map = context
            .store
            .get("entity")
            .expect("Couldn't get inner map.");
        assert_eq!(inner_map.len(), 2);
    }

    #[test]
    #[serial]
    fn cache_store_set_basic_test() {
        let mut context = get_context();

        let (entity_pointer, id_pointer, asc_map_pointer) =
            prepare_entity_store_pointers(&mut context);

        context
            .cache_store_set(
                &GasCounter::new(),
                entity_pointer,
                id_pointer,
                asc_map_pointer,
            )
            .expect("Couldn't call cache_store_set.");

        let inner_map = context
            .cache_store
            .get("entity")
            .expect("Couldn't get inner map.");
        assert_eq!(inner_map.len(), 1);
    }

    #[test]
    #[serial]
    fn cache_store_set_existing_entity_type() {
        let mut context = get_context();

        let (entity_pointer, id_pointer, asc_map_pointer) =
            prepare_entity_store_pointers(&mut context);

        context
            .cache_store
            .insert("entity".to_owned(), HashMap::new());
        let mut inner_map = context
            .cache_store
            .get("entity")
            .expect("Couldn't get inner map.")
            .clone();
        inner_map.insert("another_id".to_owned(), HashMap::new());
        context.cache_store.insert("entity".to_owned(), inner_map);

        context
            .cache_store_set(
                &GasCounter::new(),
                entity_pointer,
                id_pointer,
                asc_map_pointer,
            )
            .expect("Couldn't call cache_store_get.");

        let inner_map = context
            .cache_store
            .get("entity")
            .expect("Couldn't get inner map.");
        assert_eq!(inner_map.len(), 2);
    }

    #[test]
    #[serial]
    fn mock_store_load_related_basic_test() {
        let mut context = get_context();

        let mut parent_entity_relation_map = HashMap::new();
        parent_entity_relation_map.insert(
            "virtual_field".to_owned(),
            vec![("ChildEntity".to_owned(), "parent".to_owned())],
        );
        context
            .derived
            .insert("ParentEntity".to_owned(), parent_entity_relation_map);

        let parent_entity_id = Value::String("p_1".to_owned());
        let mut parent_entity: HashMap<String, Value> = HashMap::new();
        let mut parent_entity_inner: HashMap<String, HashMap<String, Value>> = HashMap::new();
        parent_entity.insert("id".to_owned(), parent_entity_id.clone());
        parent_entity_inner.insert(parent_entity_id.clone().to_string(), parent_entity);

        context
            .store
            .insert("ParentEntity".to_owned(), parent_entity_inner);

        let mut child_entity: HashMap<String, Value> = HashMap::new();
        let mut child_entity_inner: HashMap<String, HashMap<String, Value>> = HashMap::new();
        child_entity.insert("id".to_owned(), Value::String("c_1".to_owned()));
        child_entity.insert("parent".to_owned(), parent_entity_id.clone());
        child_entity_inner.insert(
            child_entity.get("id").unwrap().to_string(),
            child_entity.clone(),
        );

        context
            .store
            .insert("ChildEntity".to_owned(), child_entity_inner);

        let entity_type_ptr = AscPtr::alloc_obj(
            asc_string_from_str("ParentEntity"),
            &mut context.wasm_ctx,
            &GasCounter::new(),
        )
        .expect("Couldn't create entity_type_ptr.");
        let entity_id_ptr = AscPtr::alloc_obj(
            asc_string_from_str(&parent_entity_id.clone().to_string()),
            &mut context.wasm_ctx,
            &GasCounter::new(),
        )
        .expect("Couldn't create entity_id_ptr.");
        let entity_virtual_field_ptr = AscPtr::alloc_obj(
            asc_string_from_str("virtual_field"),
            &mut context.wasm_ctx,
            &GasCounter::new(),
        )
        .expect("Couldn't create entity_virtual_field_ptr.");

        let related_entities_ptr = context
            .mock_store_load_related(
                &GasCounter::new(),
                entity_type_ptr,
                entity_id_ptr,
                entity_virtual_field_ptr,
            )
            .unwrap();

        let related_entities: Vec<HashMap<String, Value>> =
            asc_get::<_, Array<AscPtr<AscEntity>>, _>(
                &context.wasm_ctx,
                related_entities_ptr,
                &GasCounter::new(),
                0,
            )
            .unwrap();

        assert_eq!(related_entities.len(), 1);
        assert_eq!(related_entities.first().unwrap(), &child_entity);
    }

    #[test]
    #[serial]
    fn mock_store_load_related_no_relations_test() {
        let mut context = get_context();

        let mut parent_entity_relation_map = HashMap::new();
        parent_entity_relation_map.insert(
            "virtual_field".to_owned(),
            vec![("ChildEntity".to_owned(), "parent".to_owned())],
        );
        context
            .derived
            .insert("ParentEntity".to_owned(), parent_entity_relation_map);

        let parent_entity_id = Value::String("p_1".to_owned());
        let mut parent_entity: HashMap<String, Value> = HashMap::new();
        let mut parent_entity_inner: HashMap<String, HashMap<String, Value>> = HashMap::new();
        parent_entity.insert("id".to_owned(), parent_entity_id.clone());

        parent_entity_inner.insert(parent_entity_id.clone().to_string(), parent_entity);
        context
            .store
            .insert("ParentEntity".to_owned(), parent_entity_inner);

        let entity_type_ptr = AscPtr::alloc_obj(
            asc_string_from_str("ParentEntity"),
            &mut context.wasm_ctx,
            &GasCounter::new(),
        )
        .expect("Couldn't create entity_type_ptr.");
        let entity_id_ptr = AscPtr::alloc_obj(
            asc_string_from_str(&parent_entity_id.clone().to_string()),
            &mut context.wasm_ctx,
            &GasCounter::new(),
        )
        .expect("Couldn't create entity_id_ptr.");
        let entity_virtual_field_ptr = AscPtr::alloc_obj(
            asc_string_from_str("virtual_field"),
            &mut context.wasm_ctx,
            &GasCounter::new(),
        )
        .expect("Couldn't create entity_virtual_field_ptr.");

        let related_entities_ptr = context
            .mock_store_load_related(
                &GasCounter::new(),
                entity_type_ptr,
                entity_id_ptr,
                entity_virtual_field_ptr,
            )
            .unwrap();

        let related_entities: Vec<HashMap<String, Value>> =
            asc_get::<_, Array<AscPtr<AscEntity>>, _>(
                &context.wasm_ctx,
                related_entities_ptr,
                &GasCounter::new(),
                0,
            )
            .unwrap();

        assert_eq!(related_entities.len(), 0);
    }

    #[test]
    #[serial]
    fn mock_store_load_related_bytes_id_test() {
        let mut context = get_context();

        let mut parent_entity_relation_map = HashMap::new();
        parent_entity_relation_map.insert(
            "virtual_field".to_owned(),
            vec![("ChildEntity".to_owned(), "parent".to_owned())],
        );
        context
            .derived
            .insert("ParentEntity".to_owned(), parent_entity_relation_map);

        let parent_entity_id = Value::Bytes("p_1".as_bytes().into());
        let mut parent_entity: HashMap<String, Value> = HashMap::new();
        let mut parent_entity_inner: HashMap<String, HashMap<String, Value>> = HashMap::new();
        parent_entity.insert("id".to_owned(), parent_entity_id.clone());
        parent_entity_inner.insert(parent_entity_id.clone().to_string(), parent_entity);

        context
            .store
            .insert("ParentEntity".to_owned(), parent_entity_inner);

        let mut child_entity: HashMap<String, Value> = HashMap::new();
        let mut child_entity_inner: HashMap<String, HashMap<String, Value>> = HashMap::new();
        child_entity.insert("id".to_owned(), Value::String("c_1".to_owned()));
        child_entity.insert("parent".to_owned(), parent_entity_id.clone());
        child_entity_inner.insert(
            child_entity.get("id").unwrap().to_string(),
            child_entity.clone(),
        );

        context
            .store
            .insert("ChildEntity".to_owned(), child_entity_inner);

        let entity_type_ptr = AscPtr::alloc_obj(
            asc_string_from_str("ParentEntity"),
            &mut context.wasm_ctx,
            &GasCounter::new(),
        )
        .expect("Couldn't create entity_type_ptr.");
        let entity_id_ptr = AscPtr::alloc_obj(
            asc_string_from_str(&parent_entity_id.clone().to_string()),
            &mut context.wasm_ctx,
            &GasCounter::new(),
        )
        .expect("Couldn't create entity_id_ptr.");
        let entity_virtual_field_ptr = AscPtr::alloc_obj(
            asc_string_from_str("virtual_field"),
            &mut context.wasm_ctx,
            &GasCounter::new(),
        )
        .expect("Couldn't create entity_virtual_field_ptr.");

        let related_entities_ptr = context
            .mock_store_load_related(
                &GasCounter::new(),
                entity_type_ptr,
                entity_id_ptr,
                entity_virtual_field_ptr,
            )
            .unwrap();

        let related_entities: Vec<HashMap<String, Value>> =
            asc_get::<_, Array<AscPtr<AscEntity>>, _>(
                &context.wasm_ctx,
                related_entities_ptr,
                &GasCounter::new(),
                0,
            )
            .unwrap();

        assert_eq!(related_entities.len(), 1);
        assert_eq!(related_entities.first().unwrap(), &child_entity);
    }

    #[test]
    #[serial]
    fn mock_store_remove_basic_test() {
        let mut context = get_context();

        context.store.insert("entity".to_owned(), HashMap::new());
        let mut inner_map = context
            .store
            .get("entity")
            .expect("Couldn't get inner map.")
            .clone();
        inner_map.insert("id".to_owned(), HashMap::new());
        context.store.insert("entity".to_owned(), inner_map);

        let entity = asc_string_from_str("entity");
        let id = asc_string_from_str("id");
        let entity_pointer = AscPtr::alloc_obj(entity, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");
        let id_pointer = AscPtr::alloc_obj(id, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");

        context
            .mock_store_remove(&GasCounter::new(), entity_pointer, id_pointer)
            .expect("Couldn't call mock_store_remove.");

        assert!(!context.store.get("entity").unwrap().contains_key("id"));
    }

    #[test]
    #[serial]
    fn ethereum_call_basic_test() {
        let mut context = get_context();

        context.fn_ret_map.insert(
            "0x8920…43e7funcNamefuncName(address):(string,string)val".to_owned(),
            vec![Token::Bool(false)],
        );

        let contract_name = asc_string_from_str("contractName");
        // Necessary step because Address fits (hashes) the address into 20 bytes
        // whereas otherwise it will be 42 and asc_get (in ethereum_call) will crash
        let h160_address = Address::from_str("89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7")
            .expect("Couldn't create Address.");
        let address = TypedArray::new(
            h160_address.as_bytes(),
            &mut context.wasm_ctx,
            &GasCounter::new(),
        )
        .expect("Coudln't create address.");
        let func_name = asc_string_from_str("funcName");
        let func_signature = asc_string_from_str("funcName(address):(string,string)");
        let val = asc_string_from_str("val");

        let contract_name_pointer =
            AscPtr::alloc_obj(contract_name, &mut context.wasm_ctx, &GasCounter::new())
                .expect("Couldn't create pointer.");
        let address_pointer = AscPtr::alloc_obj(address, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");
        let func_name_pointer =
            AscPtr::alloc_obj(func_name, &mut context.wasm_ctx, &GasCounter::new())
                .expect("Couldn't create pointer.");
        let func_signature_pointer =
            AscPtr::alloc_obj(func_signature, &mut context.wasm_ctx, &GasCounter::new())
                .expect("Couldn't create pointer.");
        let val_ptr = AscPtr::alloc_obj(val, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");

        let asc_enum = AscEnum::<EthereumValueKind> {
            kind: EthereumValueKind::String,
            _padding: 0,
            payload: EnumPayload::from(val_ptr),
        };
        let func_args_pointer =
            AscPtr::alloc_obj(asc_enum, &mut context.wasm_ctx, &GasCounter::new())
                .expect("Couldn't create pointer.");
        let func_args_array_pointer = AscPtr::alloc_obj(
            Array::new(
                &[func_args_pointer],
                &mut context.wasm_ctx,
                &GasCounter::new(),
            )
            .expect("Couldn't create array."),
            &mut context.wasm_ctx,
            &GasCounter::new(),
        )
        .expect("Couldn't create pointer.");

        let unresolved_call = AscUnresolvedContractCall_0_0_4 {
            contract_name: contract_name_pointer,
            contract_address: address_pointer,
            function_name: func_name_pointer,
            function_signature: func_signature_pointer,
            function_args: func_args_array_pointer,
        };
        let call_pointer =
            AscPtr::alloc_obj(unresolved_call, &mut context.wasm_ctx, &GasCounter::new())
                .expect("Couldn't create pointer.");

        let result = context
            .ethereum_call(&GasCounter::new(), call_pointer.wasm_ptr())
            .expect("Couldn't call ethereum_call.");

        let fn_args: Vec<Token> = asc_get::<_, Array<AscPtr<AscEnum<EthereumValueKind>>>, _>(
            &context.wasm_ctx,
            result,
            &GasCounter::new(),
            0,
        )
        .expect("Couldn't unwrap result.");
        assert_eq!(fn_args[0], Token::Bool(false));
    }

    #[test]
    #[serial]
    fn ethereum_call_reverting_func() {
        let mut context = get_context();

        context.fn_ret_map.insert(
            "0x8920…43e7funcNamefuncName(address):(string,string)val".to_owned(),
            REVERTS_IDENTIFIER.clone(),
        );

        let contract_name = asc_string_from_str("contractName");
        // Necessary step because Address fits (hashes) the address into 20 bytes
        // whereas otherwise it will be 42 and asc_get (in ethereum_call) will crash
        let h160_address = Address::from_str("89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7")
            .expect("Couldn't create Address.");
        let address = TypedArray::new(
            h160_address.as_bytes(),
            &mut context.wasm_ctx,
            &GasCounter::new(),
        )
        .expect("Coudln't create address.");
        let func_name = asc_string_from_str("funcName");
        let func_signature = asc_string_from_str("funcName(address):(string,string)");
        let val = asc_string_from_str("val");

        let contract_name_pointer =
            AscPtr::alloc_obj(contract_name, &mut context.wasm_ctx, &GasCounter::new())
                .expect("Couldn't create pointer.");
        let address_pointer = AscPtr::alloc_obj(address, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");
        let func_name_pointer =
            AscPtr::alloc_obj(func_name, &mut context.wasm_ctx, &GasCounter::new())
                .expect("Couldn't create pointer.");
        let func_signature_pointer =
            AscPtr::alloc_obj(func_signature, &mut context.wasm_ctx, &GasCounter::new())
                .expect("Couldn't create pointer.");
        let val_ptr = AscPtr::alloc_obj(val, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");

        let asc_enum = AscEnum::<EthereumValueKind> {
            kind: EthereumValueKind::String,
            _padding: 0,
            payload: EnumPayload::from(val_ptr),
        };
        let func_args_pointer =
            AscPtr::alloc_obj(asc_enum, &mut context.wasm_ctx, &GasCounter::new())
                .expect("Couldn't create pointer.");
        let func_args_array_pointer = AscPtr::alloc_obj(
            Array::new(
                &[func_args_pointer],
                &mut context.wasm_ctx,
                &GasCounter::new(),
            )
            .expect("Couldn't create array."),
            &mut context.wasm_ctx,
            &GasCounter::new(),
        )
        .expect("Couldn't create pointer.");

        let unresolved_call = AscUnresolvedContractCall_0_0_4 {
            contract_name: contract_name_pointer,
            contract_address: address_pointer,
            function_name: func_name_pointer,
            function_signature: func_signature_pointer,
            function_args: func_args_array_pointer,
        };
        let call_pointer =
            AscPtr::alloc_obj(unresolved_call, &mut context.wasm_ctx, &GasCounter::new())
                .expect("Couldn't create pointer.");

        let result = context
            .ethereum_call(&GasCounter::new(), call_pointer.wasm_ptr())
            .expect("Couldn't call ethereum_call.");

        assert!(result.is_null());
    }

    #[test]
    #[serial]
    fn mock_function_basic_test() {
        let mut context = get_context();

        // Necessary step because Address fits (hashes) the
        // address into 20 bytes whereas otherwise it will be 42
        let h160_address = Address::from_str("89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7")
            .expect("Couldn't create Address.");
        let address = TypedArray::new(
            h160_address.as_bytes(),
            &mut context.wasm_ctx,
            &GasCounter::new(),
        )
        .expect("Coudln't create address.");
        let func_name = asc_string_from_str("funcName");
        let func_signature = asc_string_from_str("funcName(address):(string,string)");

        let address_pointer = AscPtr::alloc_obj(address, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");
        let func_name_pointer =
            AscPtr::alloc_obj(func_name, &mut context.wasm_ctx, &GasCounter::new())
                .expect("Couldn't create pointer.");
        let func_signature_pointer =
            AscPtr::alloc_obj(func_signature, &mut context.wasm_ctx, &GasCounter::new())
                .expect("Couldn't create pointer.");
        let reverts_pointer = AscPtr::new(0);

        let asc_enum = AscEnum::<EthereumValueKind> {
            kind: EthereumValueKind::Address,
            _padding: 0,
            payload: EnumPayload::from(address_pointer),
        };
        let func_args_pointer =
            AscPtr::alloc_obj(asc_enum, &mut context.wasm_ctx, &GasCounter::new())
                .expect("Couldn't create pointer.");
        let func_args_array_pointer = AscPtr::alloc_obj(
            Array::new(
                &[func_args_pointer],
                &mut context.wasm_ctx,
                &GasCounter::new(),
            )
            .expect("Couldn't create array."),
            &mut context.wasm_ctx,
            &GasCounter::new(),
        )
        .expect("Couldn't create pointer.");

        context
            .mock_function(
                &GasCounter::new(),
                address_pointer.wasm_ptr(),
                func_name_pointer,
                func_signature_pointer,
                func_args_array_pointer.wasm_ptr(),
                func_args_array_pointer.wasm_ptr(),
                reverts_pointer,
            )
            .expect("Couldn't call mock_function.");

        println!("{:?}", context.fn_ret_map);

        let token = context
            .fn_ret_map
            .get("0x8920…43e7funcNamefuncName(address):(string,string)89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7")
            .unwrap()[0]
            .clone();
        assert_eq!(
            &token.to_string(),
            "89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7"
        );
    }

    #[test]
    #[serial]
    fn mock_function_reverts() {
        let mut context = get_context();

        // Necessary step because Address fits (hashes) the
        // address into 20 bytes whereas otherwise it will be 42
        let h160_address = Address::from_str("89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7")
            .expect("Couldn't create Address.");
        let address = TypedArray::new(
            h160_address.as_bytes(),
            &mut context.wasm_ctx,
            &GasCounter::new(),
        )
        .expect("Coudln't create address.");
        let func_name = asc_string_from_str("funcName");
        let func_signature = asc_string_from_str("funcName(address):(string,string)");

        let address_pointer = AscPtr::alloc_obj(address, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");
        let func_name_pointer =
            AscPtr::alloc_obj(func_name, &mut context.wasm_ctx, &GasCounter::new())
                .expect("Couldn't create pointer.");
        let func_signature_pointer =
            AscPtr::alloc_obj(func_signature, &mut context.wasm_ctx, &GasCounter::new())
                .expect("Couldn't create pointer.");
        let reverts_pointer = AscPtr::new(1);

        let asc_enum = AscEnum::<EthereumValueKind> {
            kind: EthereumValueKind::Address,
            _padding: 0,
            payload: EnumPayload::from(address_pointer),
        };
        let func_args_pointer =
            AscPtr::alloc_obj(asc_enum, &mut context.wasm_ctx, &GasCounter::new())
                .expect("Couldn't create pointer.");
        let func_args_array_pointer = AscPtr::alloc_obj(
            Array::new(
                &[func_args_pointer],
                &mut context.wasm_ctx,
                &GasCounter::new(),
            )
            .expect("Couldn't create array."),
            &mut context.wasm_ctx,
            &GasCounter::new(),
        )
        .expect("Couldn't create pointer.");

        context
            .mock_function(
                &GasCounter::new(),
                address_pointer.wasm_ptr(),
                func_name_pointer,
                func_signature_pointer,
                func_args_array_pointer.wasm_ptr(),
                func_args_array_pointer.wasm_ptr(),
                reverts_pointer,
            )
            .expect("Couldn't call mock_function.");

        let token = context
            .fn_ret_map
            .get("0x8920…43e7funcNamefuncName(address):(string,string)89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7")
            .unwrap()[0]
            .clone();
        assert_eq!(token, REVERTS_IDENTIFIER[0]);
    }

    #[test]
    #[serial]
    fn test_datasource_mocking_and_getting_address_network_context() {
        let mut context = get_context();

        let key = asc_string_from_str("key");
        let data = asc_string_from_str("data");
        let key_pointer = AscPtr::alloc_obj(key, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");
        let data_pointer = AscPtr::alloc_obj(data, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");

        let payload = AscEnum::<StoreValueKind> {
            kind: StoreValueKind::String,
            _padding: 0,
            payload: EnumPayload::from(data_pointer),
        };
        let payload_pointer = AscPtr::alloc_obj(payload, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");
        let map_entry = AscTypedMapEntry {
            key: key_pointer,
            value: payload_pointer,
        };
        let map_entry_pointer =
            AscPtr::alloc_obj(map_entry, &mut context.wasm_ctx, &GasCounter::new())
                .expect("Couldn't create pointer.");
        let asc_map = AscTypedMap {
            entries: AscPtr::alloc_obj(
                Array::new(
                    &[map_entry_pointer],
                    &mut context.wasm_ctx,
                    &GasCounter::new(),
                )
                .expect("Couldn't create Array."),
                &mut context.wasm_ctx,
                &GasCounter::new(),
            )
            .expect("Couldn't create pointer."),
        };
        let asc_entity = AscPtr::alloc_obj(asc_map, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");

        let mut result_tuple = get_address_network_context(&mut context);

        assert_eq!(
            Address::from_str("0x0000000000000000000000000000000000000000")
                .expect("Couldn't create Address."),
            result_tuple.0
        );
        assert_eq!("mainnet", result_tuple.1);
        assert_eq!(0, result_tuple.2.len());

        let new_address = AscPtr::alloc_obj(
            asc_string_from_str("0x90cBa2Bbb19ecc291A12066Fd8329D65FA1f1947"),
            &mut context.wasm_ctx,
            &GasCounter::new(),
        )
        .unwrap();
        let new_network = AscPtr::alloc_obj(
            asc_string_from_str("sidenet"),
            &mut context.wasm_ctx,
            &GasCounter::new(),
        )
        .unwrap();
        context
            .set_data_source_return_values(&GasCounter::new(), new_address, new_network, asc_entity)
            .unwrap();

        result_tuple = get_address_network_context(&mut context);

        assert_eq!(
            Address::from_str("0x90cBa2Bbb19ecc291A12066Fd8329D65FA1f1947")
                .expect("Couldn't create Address."),
            result_tuple.0
        );
        assert_eq!("sidenet", result_tuple.1);
        assert_eq!(1, result_tuple.2.len());
        assert_eq!(
            &Value::String("data".to_owned()),
            result_tuple.2.get("key").unwrap()
        );
    }

    fn get_address_network_context(
        context: &mut MatchstickInstanceContext<Chain>,
    ) -> (Address, String, HashMap<String, Value>) {
        let address_ptr = context
            .mock_data_source_address(&GasCounter::new())
            .unwrap();
        let network_ptr = context
            .mock_data_source_network(&GasCounter::new())
            .unwrap();
        let context_ptr = context
            .mock_data_source_context(&GasCounter::new())
            .unwrap()
            .wasm_ptr();

        let address: Address =
            asc_get(&context.wasm_ctx, address_ptr, &GasCounter::new(), 0).unwrap();
        let network: String =
            asc_get(&context.wasm_ctx, network_ptr, &GasCounter::new(), 0).unwrap();
        let context: HashMap<String, Value> = asc_get(
            &context.wasm_ctx,
            AscPtr::new(context_ptr),
            &GasCounter::new(),
            0,
        )
        .unwrap();

        (address, network, context)
    }

    #[test]
    #[serial]
    fn count_entities_basic_test() {
        let mut context = get_context();

        let gravatar = asc_string_from_str("gravatar");
        let gravatar_ptr = AscPtr::alloc_obj(gravatar, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");

        let mut result = context
            .count_entities(&GasCounter::new(), gravatar_ptr)
            .unwrap();

        assert_eq!(0, result);

        let mut gravatar_map = HashMap::new();
        gravatar_map.insert("gravatar1".to_owned(), HashMap::new());
        gravatar_map.insert("gravatar2".to_owned(), HashMap::new());
        context.store.insert("gravatar".to_owned(), gravatar_map);

        result = context
            .count_entities(&GasCounter::new(), gravatar_ptr)
            .unwrap();

        assert_eq!(2, result);
    }

    #[test]
    #[serial]
    fn mock_ipfs_file_basic_test() {
        let mut context = get_context();

        assert_eq!(context.ipfs.len(), 0);

        let hash = asc_string_from_str("QmTkzDwWqPbnAh5YiV5VwcTLnGdwSNsNTn2aDxdXBFca7D");
        let file = asc_string_from_str("./mocks/ipfs.json");
        let hash_ptr = AscPtr::alloc_obj(hash, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");
        let file_ptr = AscPtr::alloc_obj(file, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");

        context
            .mock_ipfs_file(&GasCounter::new(), hash_ptr, file_ptr)
            .unwrap();

        assert_eq!(context.ipfs.len(), 1);
        assert!(context
            .ipfs
            .contains_key("QmTkzDwWqPbnAh5YiV5VwcTLnGdwSNsNTn2aDxdXBFca7D"));
        assert_eq!(
            context
                .ipfs
                .get("QmTkzDwWqPbnAh5YiV5VwcTLnGdwSNsNTn2aDxdXBFca7D"),
            Some(&"./mocks/ipfs.json".to_owned())
        );
    }

    #[test]
    #[serial]
    fn mock_ipfs_cat() {
        let mut context = get_context();

        let hash = asc_string_from_str("QmTkzDwWqPbnAh5YiV5VwcTLnGdwSNsNTn2aDxdXBFca7D");
        let file = asc_string_from_str("./mocks/ipfs/cat.json");
        let hash_ptr = AscPtr::alloc_obj(hash, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");
        let file_ptr = AscPtr::alloc_obj(file, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");

        context
            .mock_ipfs_file(&GasCounter::new(), hash_ptr, file_ptr)
            .unwrap();

        let result_ptr = context.mock_ipfs_cat(&GasCounter::new(), hash_ptr).unwrap();
        let result: Vec<u8> =
            asc_get(&context.wasm_ctx, result_ptr, &GasCounter::new(), 0).unwrap();
        let string = std::fs::read_to_string("./mocks/ipfs/cat.json").expect("File not found!");

        assert_eq!(result, string.as_bytes());
    }

    #[test]
    #[serial]
    fn mock_ipfs_map() {
        let mut context = get_context();

        let hash = asc_string_from_str("QmTkzDwWqPbnAh5YiV5VwcTLnGdwSNsNTn2aDxdXBFca7D");
        let file = asc_string_from_str("./mocks/ipfs/map.json");
        let callback = asc_string_from_str("processGravatar");
        let user_data = Value::from("Gravatar");
        let flags = vec!["json".to_owned()];

        let hash_ptr = AscPtr::alloc_obj(hash, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");
        let file_ptr = AscPtr::alloc_obj(file, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");
        let callback_ptr = AscPtr::alloc_obj(callback, &mut context.wasm_ctx, &GasCounter::new())
            .expect("Couldn't create pointer.");
        let user_data_ptr = asc_new(&mut context.wasm_ctx, &user_data, &GasCounter::new())
            .expect("Couldn't create pointer.");
        let flags_ptr = asc_new(&mut context.wasm_ctx, &flags, &GasCounter::new())
            .expect("Couldn't create pointer.");

        context
            .mock_ipfs_file(&GasCounter::new(), hash_ptr, file_ptr)
            .unwrap();

        assert_eq!(context.store.len(), 0);

        context
            .mock_ipfs_map(
                &GasCounter::new(),
                hash_ptr,
                callback_ptr,
                user_data_ptr,
                flags_ptr,
            )
            .unwrap();

        assert_eq!(context.store.len(), 1);

        let gravatar_map = context.store.get("Gravatar").expect("No such key in map");

        assert_eq!(gravatar_map.len(), 3);

        let gravatar_1 = gravatar_map.get("1").expect("No such key in map");
        let gravatar_2 = gravatar_map.get("2").expect("No such key in map");
        let gravatar_3 = gravatar_map.get("3").expect("No such key in map");

        assert_eq!(
            gravatar_1.get("displayName"),
            Some(&Value::from("Gravatar1"))
        );
        assert_eq!(
            gravatar_2.get("displayName"),
            Some(&Value::from("Gravatar2"))
        );
        assert_eq!(
            gravatar_3.get("displayName"),
            Some(&Value::from("Gravatar3"))
        );
    }
}
