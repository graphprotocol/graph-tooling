use graph::data::graphql::ext::DirectiveFinder;
use graph_graphql::graphql_parser::schema;
use std::collections::HashMap;

use crate::context::MatchstickInstanceContext;
use crate::logging;
use crate::SCHEMA_LOCATION;

// reads the graphql schema file and parses it
fn load_schema_document() -> schema::Document<'static, String> {
    let mut schema_file = "".to_owned();
    SCHEMA_LOCATION.with(|path| {
        schema_file = std::fs::read_to_string(&*path.borrow()).unwrap_or_else(|err| {
            logging::critical!(
                "Something went wrong when trying to read `{:?}`: {}",
                &*path.borrow(),
                err,
            )
        });
    });

    schema::parse_schema::<String>(&schema_file)
        .unwrap_or_else(|err| {
            logging::critical!(
                "Something went wrong when trying to parse `schema.graphql`: {}",
                err
            )
        })
        .into_static()
}

pub(crate) fn populate_schema_definitions<C: graph::blockchain::Blockchain>(
    context: &mut MatchstickInstanceContext<C>,
) {
    let schema_document = load_schema_document();

    schema_document.definitions.iter().for_each(|def| {
        if let schema::Definition::TypeDefinition(schema::TypeDefinition::Interface(entity_def)) =
            def
        {
            // initiate all interfaces defined in the schema
            // to be easier to check if a given entity is an interface or not
            if !context.interface_to_entities.contains_key(&entity_def.name) {
                context
                    .interface_to_entities
                    .insert(entity_def.name.clone(), Vec::new());
            }
        }

        if let schema::Definition::TypeDefinition(schema::TypeDefinition::Object(entity_def)) = def
        {
            // map current entity to its interfaces
            if !entity_def.implements_interfaces.is_empty() {
                entity_def
                    .implements_interfaces
                    .iter()
                    .for_each(|interface_name| {
                        let entities = context
                            .interface_to_entities
                            .entry(interface_name.to_string())
                            .or_insert(Vec::new());

                        entities.push(entity_def.name.clone());
                    });
            }

            context
                .schema
                .insert(entity_def.name.clone(), entity_def.clone());
        }
    });
}

pub(crate) fn populate_derived_fields<C: graph::blockchain::Blockchain>(
    context: &mut MatchstickInstanceContext<C>,
) {
    context
        .schema
        .iter()
        .for_each(|(entity_type, entity_object)| {
            let derived_fields = entity_object.fields.iter().filter(|&f| f.is_derived());
            for virtual_field in derived_fields {
                // field type is received as: '[ExampleClass!]!' and needs to be reduced to a class string
                // it could be an entity or interface
                let derived_from_entity_type = virtual_field
                    .field_type
                    .to_string()
                    .replace(['!', '[', ']'], "");
                let mut directive = virtual_field.find_directive("derivedFrom").unwrap().clone();

                let derived_from_entity_field = directive
                    .arguments
                    .pop()
                    .unwrap()
                    .1
                    .to_string()
                    .replace('\"', "");

                let mut derived_from_entities = vec![(
                    derived_from_entity_type.clone(),
                    derived_from_entity_field.clone(),
                )];

                // checks whether the derived entity is an interface
                // and maps all entities that implements it
                if context
                    .interface_to_entities
                    .contains_key(&derived_from_entity_type)
                {
                    derived_from_entities = context
                        .interface_to_entities
                        .get(&derived_from_entity_type)
                        .unwrap()
                        .iter()
                        .map(|entity_name| (entity_name.clone(), derived_from_entity_field.clone()))
                        .collect();
                }

                let default_entity_virtual_fields: HashMap<String, Vec<(String, String)>> =
                    HashMap::new();
                let entity_virtual_fields = context
                    .derived
                    .entry(entity_type.clone())
                    .or_insert(default_entity_virtual_fields);
                entity_virtual_fields
                    .entry(virtual_field.name.clone())
                    .or_insert(derived_from_entities);
            }
        });
}

pub(crate) fn get_entity_required_fields<C: graph::blockchain::Blockchain>(
    context: &mut MatchstickInstanceContext<C>,
    entity_type: String,
) -> Vec<&schema::Field<'static, String>> {
    context
        .schema
        .get(&entity_type)
        .unwrap_or_else(|| {
            logging::critical!(
                "Something went wrong! Could not find the entity defined in the GraphQL schema."
            )
        })
        .fields
        .iter()
        .clone()
        .filter(|&f| matches!(f.field_type, schema::Type::NonNullType(..)) && !f.is_derived())
        .collect()
}
