use std::collections::{BTreeMap, BTreeSet};

use graph::{
    blockchain::{block_stream::FirehoseCursor, BlockPtr},
    components::store::{
        DeploymentCursorTracker, EntityKey, ReadStore, StoredDynamicDataSource, WritableStore,
    },
    data::subgraph::schema::{SubgraphError, SubgraphHealth},
    data_source::CausalityRegion,
    prelude::*,
    schema::InputSchema,
};

pub struct MockWritableStore {}

#[async_trait]
impl DeploymentCursorTracker for MockWritableStore {
    fn block_ptr(&self) -> Option<BlockPtr> {
        unreachable!()
    }

    fn firehose_cursor(&self) -> graph::blockchain::block_stream::FirehoseCursor {
        unreachable!()
    }
}

#[async_trait]
impl ReadStore for MockWritableStore {
    fn get(
        &self,
        _key: &graph::components::store::EntityKey,
    ) -> Result<Option<Entity>, StoreError> {
        unreachable!()
    }

    fn get_many(&self, _: BTreeSet<EntityKey>) -> Result<BTreeMap<EntityKey, Entity>, StoreError> {
        unreachable!()
    }

    fn get_derived(
        &self,
        _query_derived: &graph::components::store::DerivedEntityQuery,
    ) -> Result<std::collections::BTreeMap<graph::components::store::EntityKey, Entity>, StoreError>
    {
        unreachable!()
    }

    fn input_schema(&self) -> Arc<InputSchema> {
        let id = DeploymentHash::new("Qm123").unwrap();
        let schema =
            InputSchema::parse("type User @entity { id: String!, name: String! }", id).unwrap();
        Arc::from(schema)
    }
}

#[async_trait]
impl WritableStore for MockWritableStore {
    async fn causality_region_curr_val(&self) -> Result<Option<CausalityRegion>, StoreError> {
        unreachable!()
    }

    async fn restart(self: Arc<Self>) -> Result<Option<Arc<dyn WritableStore>>, StoreError> {
        unreachable!()
    }

    async fn start_subgraph_deployment(&self, _logger: &Logger) -> Result<(), StoreError> {
        unreachable!()
    }

    async fn revert_block_operations(
        &self,
        _block_ptr_to: BlockPtr,
        _firehose_cursor: FirehoseCursor,
    ) -> Result<(), StoreError> {
        unreachable!()
    }

    async fn unfail_deterministic_error(
        &self,
        _current_ptr: &BlockPtr,
        _parent_ptr: &BlockPtr,
    ) -> Result<UnfailOutcome, StoreError> {
        unreachable!()
    }

    fn unfail_non_deterministic_error(
        &self,
        _current_ptr: &BlockPtr,
    ) -> Result<UnfailOutcome, StoreError> {
        unreachable!()
    }

    async fn fail_subgraph(&self, _error: SubgraphError) -> Result<(), StoreError> {
        unreachable!()
    }

    async fn supports_proof_of_indexing(&self) -> Result<bool, StoreError> {
        unreachable!()
    }

    async fn transact_block_operations(
        &self,
        _block_ptr_to: BlockPtr,
        _firehose_cursor: FirehoseCursor,
        _mods: Vec<EntityModification>,
        _stopwatch: &StopwatchMetrics,
        _data_sources: Vec<StoredDynamicDataSource>,
        _deterministic_errors: Vec<SubgraphError>,
        _offchain_to_remove: Vec<StoredDynamicDataSource>,
        _is_non_fatal_errors_active: bool,
    ) -> Result<(), StoreError> {
        unreachable!()
    }

    fn deployment_synced(&self) -> Result<(), StoreError> {
        unreachable!()
    }

    async fn is_deployment_synced(&self) -> Result<bool, StoreError> {
        unreachable!()
    }

    fn unassign_subgraph(&self) -> Result<(), StoreError> {
        unreachable!()
    }

    async fn load_dynamic_data_sources(
        &self,
        _manifest_idx_and_name: Vec<(u32, String)>,
    ) -> Result<Vec<StoredDynamicDataSource>, StoreError> {
        unreachable!()
    }

    fn shard(&self) -> &str {
        unreachable!()
    }

    async fn health(&self) -> Result<SubgraphHealth, StoreError> {
        unreachable!()
    }

    async fn flush(&self) -> Result<(), graph::prelude::StoreError> {
        unreachable!()
    }
}
