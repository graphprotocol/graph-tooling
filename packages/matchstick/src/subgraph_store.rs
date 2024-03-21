use std::result::Result;
use std::sync::Arc;

use async_trait::async_trait;
use graph::{
    blockchain::BlockPtr,
    components::store::{DeploymentId, DeploymentLocator, EnsLookup, SubgraphFork},
    data::subgraph::*,
    prelude::{ApiVersion, DeploymentHash, EntityOperation, NodeId, StoreError, SubgraphStore},
    schema::{ApiSchema, InputSchema},
    slog::Logger,
};

use crate::writable_store::MockWritableStore;

pub struct MockSubgraphStore {}

struct DummyStruct {}

impl EnsLookup for DummyStruct {
    fn find_name(&self, _hash: &str) -> Result<Option<String>, StoreError> {
        Ok(Option::from("default".to_owned()))
    }

    fn is_table_empty(&self) -> Result<bool, StoreError> {
        Ok(false)
    }
}

#[async_trait]
impl SubgraphStore for MockSubgraphStore {
    fn ens_lookup(&self) -> Arc<(dyn EnsLookup + 'static)> {
        Arc::from(DummyStruct {})
    }

    fn create_subgraph_features(&self, _features: DeploymentFeatures) -> Result<(), StoreError> {
        unreachable!()
    }

    async fn stop_subgraph(&self, _deployment: &DeploymentLocator) -> Result<(), StoreError> {
        unreachable!()
    }

    fn active_locator(&self, _hash: &str) -> Result<Option<DeploymentLocator>, StoreError> {
        unreachable!()
    }

    async fn set_manifest_raw_yaml(
        &self,
        _hash: &DeploymentHash,
        _raw_yaml: String,
    ) -> Result<(), StoreError> {
        unreachable!()
    }

    fn instrument(&self, _deployment: &DeploymentLocator) -> Result<bool, StoreError> {
        unreachable!()
    }

    fn assignment_status(
        &self,
        _deployment: &DeploymentLocator,
    ) -> Result<Option<(NodeId, bool)>, StoreError> {
        unreachable!()
    }

    fn active_assignments(&self, _node: &NodeId) -> Result<Vec<DeploymentLocator>, StoreError> {
        unreachable!()
    }

    fn graft_pending(&self, _id: &DeploymentHash) -> Result<bool, StoreError> {
        unreachable!()
    }

    async fn subgraph_features(
        &self,
        _deployment: &DeploymentHash,
    ) -> Result<Option<DeploymentFeatures>, StoreError> {
        unreachable!()
    }

    fn is_deployed(&self, _id: &DeploymentHash) -> Result<bool, StoreError> {
        unreachable!()
    }

    fn create_subgraph_deployment(
        &self,
        _name: SubgraphName,
        _schema: &graph::schema::InputSchema,
        _deployment: graph::data::subgraph::schema::DeploymentCreate,
        _node_id: graph::prelude::NodeId,
        _network: String,
        _mode: graph::prelude::SubgraphVersionSwitchingMode,
    ) -> Result<DeploymentLocator, graph::prelude::StoreError> {
        unreachable!()
    }

    fn create_subgraph(&self, _name: SubgraphName) -> Result<String, graph::prelude::StoreError> {
        unreachable!()
    }

    fn debug_fork(
        &self,
        _subgraph_id: &DeploymentHash,
        _logger: Logger,
    ) -> Result<Option<Arc<dyn SubgraphFork>>, StoreError> {
        unreachable!()
    }

    fn remove_subgraph(&self, _name: SubgraphName) -> Result<(), graph::prelude::StoreError> {
        unreachable!()
    }

    fn reassign_subgraph(
        &self,
        _deployment: &DeploymentLocator,
        _node_id: &graph::prelude::NodeId,
    ) -> Result<(), graph::prelude::StoreError> {
        unreachable!()
    }

    fn assigned_node(
        &self,
        _deployment: &DeploymentLocator,
    ) -> Result<Option<graph::prelude::NodeId>, graph::prelude::StoreError> {
        unreachable!()
    }

    fn assignments(
        &self,
        _node: &graph::prelude::NodeId,
    ) -> Result<Vec<DeploymentLocator>, graph::prelude::StoreError> {
        unreachable!()
    }

    fn subgraph_exists(&self, _name: &SubgraphName) -> Result<bool, graph::prelude::StoreError> {
        unreachable!()
    }

    fn input_schema(&self, _subgraph_id: &DeploymentHash) -> Result<Arc<InputSchema>, StoreError> {
        unreachable!()
    }

    fn api_schema(
        &self,
        _subgraph_id: &DeploymentHash,
        _api_version: &ApiVersion,
    ) -> Result<Arc<ApiSchema>, StoreError> {
        unreachable!()
    }

    async fn writable(
        self: Arc<Self>,
        _logger: Logger,
        _deployment: DeploymentId,
        _manifest_idx_and_name: Arc<Vec<(u32, String)>>,
    ) -> Result<
        Arc<dyn graph::components::store::WritableStore>,
        graph::components::store::StoreError,
    > {
        let mock_writable_store = MockWritableStore {};
        Ok(Arc::from(mock_writable_store))
    }

    async fn least_block_ptr(
        &self,
        _id: &DeploymentHash,
    ) -> Result<Option<BlockPtr>, graph::prelude::StoreError> {
        unreachable!()
    }

    fn locators(&self, _hash: &str) -> Result<Vec<DeploymentLocator>, graph::prelude::StoreError> {
        unreachable!()
    }

    fn entity_changes_in_block(
        &self,
        _id: &graph::prelude::DeploymentHash,
        _block: i32,
    ) -> Result<Vec<EntityOperation>, graph::prelude::StoreError> {
        unreachable!()
    }

    async fn is_healthy(&self, _id: &graph::prelude::DeploymentHash) -> Result<bool, StoreError> {
        unreachable!()
    }
}
