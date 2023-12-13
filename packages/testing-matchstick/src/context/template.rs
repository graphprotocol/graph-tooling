use std::collections::HashMap;

use super::{MatchstickInstanceContext, TemplateInfo};
use anyhow::{Context as _, Result};
use graph::{
    prelude::DataSourceContext,
    runtime::{DeterministicHostError, HostExportError},
};

pub(crate) fn populate_templates<C: graph::blockchain::Blockchain>(
    context: &mut MatchstickInstanceContext<C>,
) {
    crate::MANIFEST_LOCATION.with(|path| {
        let templates = crate::parser::collect_templates(
            path.borrow().to_str().expect("Cannot convert to string."),
        );

        templates.iter().for_each(|(name, kind)| {
            context.templates.insert(name.to_string(), HashMap::new());
            context
                .template_kinds
                .insert(name.to_string(), kind.to_string());
        });
    });
}

pub(crate) fn data_source_create<C: graph::blockchain::Blockchain>(
    name: String,
    params: Vec<String>,
    context: Option<DataSourceContext>,
    instance_ctx: &mut MatchstickInstanceContext<C>,
) -> Result<(), HostExportError> {
    // Resolve the name into the right template
    instance_ctx
        .template_kinds
        .iter()
        .find(|template| template.0 == &name)
        .with_context(|| {
            format!(
                "Failed to create data source from name `{}`: \
                 No template with this name available. \
                 Available names: {}.",
                name,
                instance_ctx
                    .template_kinds
                    .iter()
                    .map(|template| template.0.to_owned())
                    .collect::<Vec<_>>()
                    .join(", ")
            )
        })
        .map_err(DeterministicHostError::from)?;

    let kind = instance_ctx.template_kinds.get(&name).unwrap();

    let template_info = TemplateInfo {
        kind: kind.to_string(),
        name: name.clone(),
        address: params[0].clone(),
        context,
    };

    let template = instance_ctx.templates.get_mut(&name).unwrap();
    template.insert(params[0].clone(), template_info);

    Ok(())
}
