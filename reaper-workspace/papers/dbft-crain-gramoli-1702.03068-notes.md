# DBFT: Efficient Byzantine Consensus with a Weak Coordinator (Crain, Gramoli, Larrea, Raynal — NCA'18 / arXiv 1702.03068)

**Local path:** `reaper-workspace/papers/dbft-crain-gramoli-1702.03068.pdf`

## Why it matters here
DBFT is the **core consensus algorithm of Red Belly Network / Red Belly Blockchain.** Understanding accountability "in the context of Red Belly" requires understanding the protocol Red Belly *actually runs*. DBFT is what `ABC^++` would (or already does, via Polygraph) wrap with an accountability layer when deployed in Red Belly.

## Setting
- `n` processes, `t < n/3` Byzantine.
- **Partially synchronous** network (Dwork–Lynch–Stockmeyer).
- **Deterministic** — no randomness, no common coin.
- **Signature-free** — relies only on authenticated channels.
- Reduces multi-valued consensus to binary consensus.

## Key design move: weak coordinator
Classic leader-based BFT (PBFT, Tendermint, HotStuff) uses a *strong* coordinator: progress requires the leader's message. A faulty leader stalls a round.
DBFT uses a **weak coordinator**: processes can complete an asynchronous round as soon as they receive a threshold of messages — they don't need to wait for the coordinator. The coordinator only *helps* break symmetry when proposals differ. This:
- avoids leader-replacement overhead under leader faults,
- preserves resilience optimality (`t < n/3`),
- gives time-optimal termination in 4 message delays.

## Algorithm sketch
1. Binary consensus (BinBC): an `O(t)`-round (worst case) signature-free binary BFT consensus, optimised so that the common case terminates in 4 message delays.
2. Multi-valued reduction: convert multi-value to binary by deciding "do we commit *some* valid proposal block?" — DBFT broadcasts the proposals in parallel and only does binary BA on inclusion bits.
3. The result: a deterministic, leaderless, signature-free, partially-synchronous BFT consensus.

## Relevance to accountability
- **Signature-free** is a problem for accountability — the standard accountability transformation (Polygraph, ABC, ABC^++) relies on signed messages to produce irrefutable evidence. **Adapting DBFT for accountability requires adding signatures** (or a multi-signature scheme), which Polygraph does explicitly.
- **Weak coordinator** means there is no single "leader to blame" — accountability must trace equivocations across all participants, not just a faulty leader. This is consistent with the ABC/ABC^++ all-process model.
- **Deterministic + partial synchrony + `t < n/3` BA threshold** matches the "easily accountable agreement functionality" class that ABC^++ Theorem 4 covers (Definition 3 in the scalable-accountability paper). DBFT is a **drop-in `Π_BA`** for ABC^++.

## Red Belly connection
- Red Belly Blockchain (RBBC) "extends a Byzantine consensus algorithm `[15]` to create a super block resulting from multiple proposed sets of transactions" — `[15]` is DBFT (see Crain–Natoli–Gramoli SP'21 / arXiv 1812.11747 §3.1).
- The deployment paper deploys *DBFT-based RBBC* on 80–1000 nodes, geo-distributed.
- **DBFT is the consensus heart of Red Belly.** Polygraph is the accountability overlay reported with it. ABC^++ would be the next-generation accountability overlay.

## Falsifier
- If a Red Belly paper used a different consensus (e.g., HotStuff variants, PBFT) at any version, the DBFT-centric Red Belly story breaks. Cross-reference with the Red Belly Blockchain paper (`red-belly-evaluating-1812.11747`) which explicitly names DBFT as the consensus.
