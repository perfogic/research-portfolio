# Ream and Fulu Specs - Focus on PeerDAS

## 1. Short overview about PeerDAS

### Before Fulu (Deneb + Electra)

After EIP-4844, at every slot, we have beacon block and blob sidecars:
<img src="https://hackmd.io/_uploads/SkdJBCmffl.png" alt="01" width="480" />

**Blob Sidecars**: carry blobs, which are temporary data and are used by L2 to publish data for transparency and are **not processed** by the Execution Layer state transition. This (L2 published data) can include:

- block and transactions
- proof of state transition
- etc.

**Beacon Block**:

- **Execution Payload**: This is the block we see normally on Etherscan
- **Blob KZG Commitments**: commitments that are used to verify that a blob is belonged to a block.
- Other fields like `attestations` or `attester_slashing`,... are not mentioned here. But can be double check in `electra` specification.

**A question is defined for this type of temporary data**:
Since blob data is not delivered to execution payload for verification, how do we know a blob data is corrected and is not modified by byzantine peers ?

**Answer:**
Before fulu, every node stores full blobs for short period of time - **18 days** and every time it receive each blob.
Simply just verify it against the commitments.
For example, in the image:

- Verify blob 0 against commitment 0
- Verify blob 1 against commitment 1

**Cons:**
Since every node stores full data, it is really hard for scaling blob data size
=> Should find a way for every node to store partial data. This is what Fulu did.

### After Fulu

For scaling, instead of storing the whole blobs in blob sidecars, every node stores only specific columns of blobs and samples by columns.

![image](https://hackmd.io/_uploads/HJ_Ac0XfGx.png)

Now the blob sidecars are replaced by **data column sidecars**.

**Data Column Sidecar**: contains a column of cells from multiple blobs, together with KZG commitments, KZG proofs, the signed block header, and an inclusion proof.

Instead of broadcasting full blob data for every blob, Fulu broadcasts data by columns:

- Before Fulu: `BlobSidecar` contains one full blob.
- From Fulu: `DataColumnSidecar` contains one column of data across blobs.

Each node only needs to custody and serve some columns, based on its custody groups. If enough columns are available, the full blob data can be reconstructed.

Stop here, a bit now I will illustrate each step of Fulu.

1. **First, blob data is encoded to create more redundancy**:

![image](https://hackmd.io/_uploads/S16iiRQzGg.png)

Since blobs do not go through the execution layer for verification, the proposer or Byzantine peers can withhold or try to modify some data.

If data is modified, nodes can detect it by verifying the data against the KZG commitments and proofs.

If data is withheld, we need redundancy so that the original blob data can still be recovered from enough available encoded data. (**Remember that making sure 100% block data exists is impossible :D**).

2. **Secondly, the encoded blob data is divided into multiple columns**:

- In PeerDAS, the encoded data is divided into 128 columns. These columns are broadcasted by GossipSub through subnet topics, namely:

```text
data_column_sidecar_{subnet_id}

with:
- subnet_id = column_index % DATA_COLUMN_SIDECAR_SUBNET_COUNT
- DATA_COLUMN_SIDECAR_SUBNET_COUNT = 128
```

![image](https://hackmd.io/_uploads/BJMI6A7GGe.png)

- Once it receive a column, namely `DataColumnSidecar` in the spec. It will verify to make sure that the column is correct. Let's see the image for illustration:
  ![image](https://hackmd.io/_uploads/ryHAxJNMfe.png)

=> That's why in the structure, you will see each column has multiple `kzg_commitments` and `kzg_proofs`.

3. **Thirdly, each node samples specific columns to check data availability**:

If many nodes can successfully sample and verify their assigned columns, then we have high confidence that the blob data is **available**.

**Note:** If some columns are missing, nodes may request them from peers through `Req/Resp`.

**Why**:
![image](https://hackmd.io/_uploads/HyLMfJ4ffg.png)

Making sure that there is no row that are withheld by more than 50%. So, before a node accepts a beacon block as data-available, its sampling process must succeed.

### Phase specification in 12s slot in Beacon chain

![image](https://hackmd.io/_uploads/ByVc7yNfGg.png)

Here will be what actions will be done in each 4s phase:

- **0s - 4s:**

```
  (parallel)
  - receive beacon block
    ├─ verify block
    ├─ start state transition validation
    ├─ execute state transition
    ├─ do another checks (i don't remember specifically :v)

  - receive/sample data column sidecars
    ├─ verify column through kzg_commiments and kzg_proofs
    ├─ after some seconds, if missed => query other peers to get columns
    ├─ execute sampling (randomly columns)

  (final check)
  - when both success
    ├─ import block into fork choice
    └─ produce attestation using updated fork-choice head
```

- **4s - 8s:**

```
  - attestations propagate
  - aggregators (optional in each node) collect attestations
```

- **8s - 12s:**

```
  - aggregators broadcast aggregate attestations
  - aggregate attestations propagate
  - next proposer prepares
```

=> So both probagation and sampling for columns should be done less than 4s.
That's all about PeerDAS, but if you want to know about network layer research in further roadmap (Full Danksharding), check my research log here:

{%preview https://www.danielpham.me/research.html#das-research-log %}

## 2. Data structure of PeerDAS in consensus-specs

For more details, you can check:

- https://github.com/ethereum/consensus-specs/blob/master/specs/fulu/das-core.md
- https://github.com/ethereum/consensus-specs/blob/master/specs/fulu/partial-columns/p2p-interface.md
- https://github.com/ethereum/consensus-specs/blob/master/specs/fulu/fork-choice.md
- https://github.com/ethereum/consensus-specs/blob/master/specs/fulu/polynomial-commitments-sampling.md

### Types

PeerDAS defines some basic types for working with the encoded data matrix.

```python
RowIndex = uint64 ## row of matrix
ColumnIndex = uint64 ## col of matrix
CustodyIndex = uint64
##  a node is assigned some custody groups,
## and those groups map to columns that the node should custody and serve

Cell = ByteVector[BYTES_PER_FIELD_ELEMENT * FIELD_ELEMENTS_PER_CELL]
# one unit of encoded blob data (cell is a box in my illustration image)
CellIndex = uint64
# which cell inside an extended blob
CommitmentIndex = uint64 # row of that cell to check commitment
```

### Constant Variables

```text
NUMBER_OF_COLUMNS = CELLS_PER_EXT_BLOB = 128
SAMPLES_PER_SLOT = 8
NUMBER_OF_CUSTODY_GROUPS = 128
CUSTODY_REQUIREMENT = 4
VALIDATOR_CUSTODY_REQUIREMENT = 8
DATA_COLUMN_SIDECAR_SUBNET_COUNT = 128
MIN_EPOCHS_FOR_DATA_COLUMN_SIDECARS_REQUESTS = 4096
```

### Containers

- **DataColumnSidecar** (as described above)

```python
class DataColumnSidecar(Container):
    index: ColumnIndex
    column: List[Cell, MAX_BLOB_COMMITMENTS_PER_BLOCK]
    kzg_commitments: List[KZGCommitment, MAX_BLOB_COMMITMENTS_PER_BLOCK]
    kzg_proofs: List[KZGProof, MAX_BLOB_COMMITMENTS_PER_BLOCK]
    signed_block_header: SignedBeaconBlockHeader
    kzg_commitments_inclusion_proof: Vector[Bytes32, KZG_COMMITMENTS_INCLUSION_PROOF_DEPTH]
```

- **MatrixEntry**

```python
class MatrixEntry(Container):
    cell: Cell
    kzg_proof: KZGProof
    column_index: ColumnIndex
    row_index: RowIndex
```

`MatrixEntry` represents one cell in the encoded data matrix, together with its KZG proof and its position `(row_index, column_index)`.

<details>
<summary>Functions</summary>
### Helper functions from das-core

- **get_custody_groups**:

```python
def get_custody_groups(node_id: NodeID, custody_group_count: uint64) -> Sequence[CustodyIndex]:
    ...
```

Selects which `custody groups` a node is responsible for, based on its `node_id` and `custody_group_count`.
=> Used to find columns for sampling process

- **compute_columns_for_custody_group**

```python
def compute_columns_for_custody_group(custody_group: CustodyIndex) -> Sequence[ColumnIndex]:
    assert custody_group < NUMBER_OF_CUSTODY_GROUPS
    columns_per_group = NUMBER_OF_COLUMNS // NUMBER_OF_CUSTODY_GROUPS
    return [
        ColumnIndex(NUMBER_OF_CUSTODY_GROUPS * i + custody_group) for i in range(columns_per_group)
    ]
```

Maps a `custody group` to the columns that belong to that group.

In current Fulu spec:

```text
NUMBER_OF_COLUMNS = 128
NUMBER_OF_CUSTODY_GROUPS = 128
columns_per_group = 1
```

- **compute_matrix**

```python
def compute_matrix(blobs: Sequence[Blob]) -> Sequence[MatrixEntry]:
    ...
```

Builds the encoded data matrix from blobs. It converts each blob into cells and KZG proofs, then stores them as MatrixEntry.

- **recover_matrix**

```python
def recover_matrix(
    partial_matrix: Sequence[MatrixEntry], blob_count: uint64
) -> Sequence[MatrixEntry]:
    ...
```

Recovers the full data matrix from enough partial matrix entries.
=> This is used when some columns are missing but the node has enough data to reconstruct them.

### Helper functions from p2p-interface

- **compute_subnet_for_data_column_sidecar**

```python
def compute_subnet_for_data_column_sidecar(column_index: ColumnIndex) -> SubnetID:
    return SubnetID(column_index % DATA_COLUMN_SIDECAR_SUBNET_COUNT)
```

- **verify_data_column_sidecar**

```python
def verify_data_column_sidecar(sidecar: DataColumnSidecar) -> bool:
    ...
```

- **verify_data_column_sidecar_inclusion_proof**

```python
def verify_data_column_sidecar_inclusion_proof(sidecar: DataColumnSidecar) -> bool:
    ...
```

- **verify_data_column_sidecar_kzg_proofs**

```python
def verify_data_column_sidecar_kzg_proofs(sidecar: DataColumnSidecar) -> bool:
    ...
```

</details>
    
### Gossip topic

```text
data_column_sidecar_{subnet_id}
```

where:

```python
subnet_id = column_index % DATA_COLUMN_SIDECAR_SUBNET_COUNT
```

### Req/Resp protocols

From Fulu, sidecars can also be requested through:

```text
/eth2/beacon_chain/req/data_column_sidecars_by_range/1/
/eth2/beacon_chain/req/data_column_sidecars_by_root/1/
```

- **DataColumnSidecarsByRange request**

```text
(
  start_slot: Slot
  count: uint64
  columns: List[ColumnIndex, NUMBER_OF_COLUMNS]
)
```

Used to request data column sidecars over a range of slots.

```
give me these columns from slot A to slot A + count
```

This is useful when a node is syncing or backfilling missing columns over time.

- **DataColumnSidecarsByRoot request**

```text
(
  List[DataColumnsByRootIdentifier, MAX_REQUEST_BLOCKS_DENEB]
)
```

Used to request data column sidecars for specific block roots and column indices.

```
give me these columns for this specific block
```

This is useful when a node already knows the block root but is missing some sidecars for that block.

### Sampling rule

From `das-core.md`:

```python
sampling_size = max(SAMPLES_PER_SLOT, custody_group_count)
groups = get_custody_groups(node_id, sampling_size)
columns = [
    compute_columns_for_custody_group(group)
    for group in groups
]
```

Sampling is successful if the node can retrieve all selected columns.

### Reconstruction rule

If a node obtains `>= 50%` of all columns, it should reconstruct the full data
matrix with:

```python
recover_matrix(partial_matrix, blob_count)
```

After reconstruction, the node can expose the reconstructed
`DataColumnSidecar`s back to the network.

## 3. What Ream already implemented and what is still missing

### What we are missing compared to Fulu

For the context, currently we are gradually trying to make sure we are compatible to the `Fulu` spec, so I just draft what we are missing here. The process of migration should be slowly adopted because change one function may affect to the network, even lead to `different app hash` if we don't test carefully.

**1. Blob is not propagated**

In `ValidatorService::propose_block`, the produced `FullBlockData` contains the block, KZG proofs, and blobs, but the validator does not broadcast it:

```rust
#[derive(Debug, Clone, Serialize, Deserialize, Encode, Decode)]
pub struct FullBlockData {
    pub block: BeaconBlock,
    pub kzg_proofs: Vec<KZGProof>,
    pub blobs: Vec<Blob>,
}

ProduceBlockData::Full(full_block) => {
    let signed_beacon_block =
        sign_beacon_block(slot, full_block.block, &keystore.private_key)?;

    self.beacon_api_client
        .publish_block(BroadcastValidation::Gossip, signed_beacon_block)
        .await?;
}
```

The good thing is when a node receive `BlobSidecar` from gossip channel, it starts to re-gossip it. (But the proposer does not broadcast, so i don't know how the blob is propagated here)

**2. Lack of functions compared to validator spec**:

Compared to the Fulu validator.md spec, we already have `get_column_data_sidecars`, which should be used by block builder to create 128 `DataColumnSidecars` for probagation. However, currently this function is **not used yet** (due to above).

Otherwise, two functions are missing.

`get_data_column_sidecars_from_block`: this is the entry point that a proposer uses right after building a block.

`get_data_column_sidecars_from_column_sidecar`: not sure about this, but this look like fetch full specific column sidecars for a block based on one `DataColumnSidecar`.

**3. Custody scaling and subscription.** The subscribe loop today is supernode-style, it just takes everything. It's good because we're not fully adopting `Fulu` yet, but I belive it's good to mention here:

```rust
for subnet_id in 0..DATA_COLUMN_SIDECAR_SUBNET_COUNT {
    topics.push(GossipTopic { fork: fork_digest, kind: GossipTopicKind::DataColumnSidecar(subnet_id) });
}
```

**4. Sync between nodes.**

Range sync currently downloads blocks and then their blob sidecars. Just remember that, once we adopt `Fulu` we will use `DataColumnSidecarsByRange`, this one has been implemented.

**5. `is_data_available` and sampling**:

Currently, `is_data_available` only checks column sidecars that are already present in the local node's storage.

```rust
pub fn is_data_available(&self, beacon_block_root: B256) -> anyhow::Result<bool> {
    let column_sidecars = self.retrieve_column_sidecars(beacon_block_root)?;
    ensure!(!column_sidecars.is_empty(), "No column sidecars available");

    for column_sidecar in column_sidecars {
        if !column_sidecar.verify() {
            return Ok(false);
        }
        if !verify_data_column_sidecar_kzg_proofs(&column_sidecar)? {
            return Ok(false);
        }
    }

    Ok(true)
}
```

and based on config of one node in spec, one node should sample only `SAMPLES_PER_SLOT = 8` columns.

**6. `recover_matrix` exists, but is not used**

`recover_matrix(partial_matrix, blob_count, das_context)` exists, but it is not wired into any reconstruction/cross-seeding flow yet. But it's good to know that we can use this in fulu.

Also, based on Tosyn's issue, there may be a bug in the current implementation: https://github.com/ReamLabs/ream/issues/1449

### The overall current state

From my context when verifying and checking with the missing parts, LLM helps me render this. Hope it's helpful

| Spec area                                       | Status                                | Where in Ream / Notes                                                                                                            |
| ----------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| State transition (`beacon-chain.md`)            | done                                  | `electra/beacon_state.rs`, `misc/fork_data.rs`, `misc/blob_parameters.rs`                                                        |
| Containers + DAS core helpers                   | mostly present                        | `data_column_sidecar.rs`, `custody_group.rs`, `matrix_entry.rs`                                                                  |
| `get_data_column_sidecars` equivalent           | present but unused                    | Ream has `get_column_data_sidecars`, but nothing calls it yet                                                                    |
| Validator spec wrapper helpers                  | missing                               | Missing `get_data_column_sidecars_from_block` and `get_data_column_sidecars_from_column_sidecar`                                 |
| Blob sidecar propagation by proposer            | missing                               | `FullBlockData` contains blobs/proofs, but `ValidatorService::propose_block` only publishes the signed beacon block              |
| Blob sidecar gossip receive/re-gossip           | present                               | If a node receives a `BlobSidecar` from gossip, it validates, stores, and re-gossips it                                          |
| Data column gossip topic + validation           | present                               | `topics.rs`, `validate/data_column_sidecar.rs`, `gossipsub/handle.rs`                                                            |
| Data column gossip production/publishing        | missing                               | No proposer path creates/publishes `DataColumnSidecar`s                                                                          |
| Req/Resp `DataColumnSidecarsByRoot` / `ByRange` | present                               | Protocol/messages/handlers exist in `req_resp/src/beacon/` and `manager/src/req_resp.rs`                                         |
| Active data column fetch by sync/fork-choice    | missing                               | Protocol exists, but sync/fork-choice do not actively request missing sampled columns                                            |
| Discovery / MetaDataV3 / `cgc` ENR              | present but not wired to real custody | `discv5/src/subnet.rs`, `discv5/src/config.rs`; `custody_group_count` is still default                                           |
| `is_data_available` / `on_block`                | partial                               | `fork_choice/beacon/src/store.rs`; checks only locally stored columns, no sampling/fetch-on-miss                                 |
| Peer sampling                                   | missing                               | No `max(SAMPLES_PER_SLOT, custody_group_count)` sample selection + peer retrieval flow                                           |
| `recover_matrix` reconstruction                 | partial / risky                       | Helper exists, but no caller; current implementation may have a field-swap bug, see issue #1449                                  |
| Reconstruction + cross-seeding control flow     | missing                               | No trigger for “50%+ columns -> recover -> store -> expose/re-gossip”                                                            |
| Range sync                                      | partial / pre-Fulu style              | Sync downloads blocks and blob sidecars; does not request custody columns via `DataColumnSidecarsByRange`                        |
| Custody scaling and subscription                | missing / temporary supernode-style   | Subscribes to all 128 data column sidecar subnets, but `cgc` remains default and is not derived from validator effective balance |
| Blob sidecar topic under Fulu                   | legacy still subscribed               | Ream still subscribes to blob sidecar topics at Fulu digest, while Fulu deprecates `blob_sidecar_{subnet_id}`                    |
| Multi-fork / `upgrade_to_fulu`                  | missing / out of current scope        | Ream uses merged Electra/Fulu-style types and hardcoded Fulu digest paths                                                        |

## 4. TODO in the future:

So for the next week, i believe we should draft a plan that we can support in migrating to make sure the compatible in the future for the spec.

Alongside with that, i will check this bad boy https://hive.leanroadmap.org/ tomorrow more in detail to know which issue that i can support.

Otherwise, this one may not related to the specification in the EPF, but fork-choice attack should be supervised to make sure that will not happen. I will also check this guy: https://notes.ethereum.org/@fradamt/das-fork-choice#Distribution-phase-and-sampling-phase
