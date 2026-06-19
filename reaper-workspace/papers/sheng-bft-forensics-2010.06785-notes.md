# BFT Protocol Forensics (Sheng, Wang, Nayak, Kannan, Viswanath — CCS'21 / arXiv 2010.06785)

**Local path:** `reaper-workspace/papers/sheng-bft-forensics-2010.06785.pdf`

## Why it matters here
This paper formalised **forensic support** as a concept distinct from accountability proper. It is the precursor of Sheng et al. FC'23 (the `[5]` reference in the scalable-accountability paper). It also produced the **`(m, k, d)` forensic-support triple** that ABC^++ generalises into its own `(m, k, d, J, valid)`-forensic-support definition.

## Definition (paper's own)
A BFT protocol provides **`(m, k, d)`-forensic support** if:
- Whenever there is a safety violation and the actual number of Byzantine replicas is `f ≤ m`, then,
- Using the transcripts of *some* `k` honest replicas,
- A forensic protocol can output **irrefutable cryptographic proof** of `d` Byzantine replicas as culpable.

The triple `(m, k, d)`:
- `m` — maximum Byzantine count under which forensics still works.
- `k` — number of *different* honest transcripts that must be combined to produce the proof.
- `d` — number of culpable replicas identified.

## Main results from the paper
- For `n = 3t + 1` PBFT/HotStuff variants with signed messages, the *strongest possible* forensic support is `(2t, 1, t+1)`: i.e., with one honest transcript, identify `t+1` culprits when up to `2t` are Byzantine.
- For unsigned variants (PBFT-MAC, HotStuff-null, Algorand): no forensics is possible (`d = 0`) even with all honest transcripts.
- For `n = 2t+1` synchronous BFT: at most one culprit can be identified — **inherent forensic-support impossibility**.

## Forensic support vs. accountability — the crucial distinction
- **Forensic support**: *some* `k` honest replicas, when their transcripts are combined, can produce proof. Evidence is *collective* — no single replica may have full proof.
- **Accountability** (later refinement, Sheng et al. FC'23 + ABC^++): **every** correct replica individually produces full proof — `k = 1` from the perspective of each correct process.

ABC^++'s Section 3 explicitly preserves this distinction:
- `(m, k, d, J, valid)`-**forensic support** = "the violation of `P` with `f ≤ m` implies, except with negligible probability, the existence of a set of `k` honest processes that have triggered `yield_certificate(...)` such that combining their evidence yields a verdict against `d` distinct processes."
- `(m, d, J)`-**accountability** = "the violation of `P` with `f ≤ m` implies that, except with negligible probability, **every correct process** `pᵢ` eventually triggers `generate_proof(sᵢ)` such that `J(sᵢ)` returns a set of `d` distinct processes."

## Communication cost
- Sheng et al.'s forensic support is "for free" in the sense that no extra messages are added — they extract evidence from the protocol's existing signed messages.
- This is `+0` overhead, but only forensic support, not accountability — that's why the `o(n²)`-overhead Sheng et al. FC'23 paper is needed for the accountability uplift, and why ABC^++ (which goes even further) is the headline contribution.

## Significance
- **Established forensic support as a primitive worth formalising**, separate from "accountability" (which had become overloaded). ABC^++ now sits on top of this distinction, giving subquadratic *accountability* (not just forensic support) for the first time.
- **Provided the first impossibility results** (`n = 2t+1` synchronous BFT has `d ≤ 1`) — these are background-relevant to ABC^++'s "for `n ≤ 3t` synchronous BFT, no forensic-support uplift can give better than `d = 1`" caveat.
