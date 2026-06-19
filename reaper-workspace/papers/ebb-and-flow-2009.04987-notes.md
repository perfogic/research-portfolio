# Ebb-and-Flow Protocols: A Resolution of the Availability-Finality Dilemma (Neu, Tas, Tse — IEEE S&P'21 / arXiv 2009.04987)

**Local path:** `reaper-workspace/papers/ebb-and-flow-2009.04987.pdf`

## Why it matters here
This paper formalises the **availability-finality dilemma** — a blockchain-variant CAP theorem stating that no single ledger can simultaneously be live under dynamic participation AND safe under temporary network partitions. The construction (snap-and-chat protocols, which combine a longest-chain protocol with a BFT finality gadget) is the **modern template for finality gadgets** that Casper (and Ethereum 2.0's Gasper) tries to instantiate. Cited in `accountable-safety-implies-finality` as the source of the dilemma that the accountability theorem resolves.

## Setting & goal
- Permissionless / permissioned blockchains.
- Two desiderata, *individually* achievable but not jointly in a single ledger:
  - **Dynamic availability**: ledger stays live under arbitrary participation changes (some nodes sleep / wake).
  - **Finality / safety under partition**: a finalised prefix never reverts even during a network partition.

## Result
- **CAP-style impossibility**: no protocol can have both. (Hence the "dilemma.")
- **Ebb-and-flow protocol**: produce *two* ledgers — a fully-available `LOG_da` and a finalised prefix `LOG_fin`. Aggressive clients read the available ledger; conservative clients read the finalised prefix.
- **Snap-and-chat construction**: run a dynamically-available longest-chain protocol `Π_lc` and a partially-synchronous BFT protocol `Π_bft` in parallel; the BFT protocol takes *snapshots* of `Π_lc`'s ledger and finalises them.

## Where it connects to ABC^++ and accountability
- The dilemma motivates *why* finality gadgets exist — they are the price you pay for accountability/safety under partition while still serving availability-oriented clients.
- The scalable-accountability paper references the broader Neu–Tas–Tse line in motivating the comparison **"accountability ↔ finality"** — both ABC^++ and ebb-and-flow protocols ultimately reconcile safety properties with practicality.
- For ABC^++ wrapping a BFT primitive (DBFT in Red Belly), the BFT primitive itself is the "finality gadget" in this taxonomy.

## Significance forward
- Provides the formal language ("ebb-and-flow", "snap-and-chat", `LOG_fin` vs `LOG_da`) that the accountability-and-finality theorems use.
- Highlights that BFT-style **accountable safety** comes at the price of liveness under dynamic participation — which is fine for permissioned Red Belly-style deployments but not for permissionless settings.
