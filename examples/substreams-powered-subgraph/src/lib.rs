mod pb;
mod tables;

use pb::example::{Contract, Contracts};

use substreams::Hex;
use substreams_entity_change::pb::entity::EntityChanges;
use substreams_ethereum::pb::eth;

use tables::Tables;

#[substreams::handlers::map]
fn map_contract(block: eth::v2::Block) -> Result<Contracts, substreams::errors::Error> {
    let contracts = block
        .transactions()
        .flat_map(|tx| {
            tx.calls
                .iter()
                .filter(|call| call.call_type == 5)
                .map(|call| Contract {
                    address: format!("0x{}", Hex(&call.address).to_string()),
                    block_number: block.number,
                    timestamp: block.timestamp_seconds().to_string(),
                    ordinal: tx.begin_ordinal,
                })
        })
        .collect();
    Ok(Contracts { contracts })
}

#[substreams::handlers::map]
pub fn graph_out(contracts: Contracts) -> Result<EntityChanges, substreams::errors::Error> {
    // hash map of name to a table
    let mut tables = Tables::new();

    for contract in &contracts.contracts {
        tables
            .create_row("Contract", &contract.address)
            .set("timestamp", &contract.timestamp)
            .set("blockNumber", &contract.block_number);
    }

    Ok(tables.to_entity_changes())
}
