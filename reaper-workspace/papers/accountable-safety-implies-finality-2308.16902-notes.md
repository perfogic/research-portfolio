# Accountable Safety Implies Finality (Neu, Tas, Tse — arXiv 2308.16902, short paper)

**Local path:** `reaper-workspace/papers/accountable-safety-implies-finality-2308.16902.pdf`

## Why it matters here
This paper is the **explicit "accountability ⇒ finality"** theorem cited as `[78]` in the scalable-accountability paper. It is the cleanest formal statement that the BFT-side accountability we care about *implies* the PoS-side finality property — i.e., the two communities are studying connected (not separate) phenomena.

## Setting
- BFT state-machine replication with `n` replicas, `f` corrupted.
- **Network models** (ordered by adversary capability):
  - *Synchronous* `(Aₛ, Zₛ)`: delays bounded by known `Δ`.
  - *Partially synchronous* `(Aₚ, Zₚ)`: delays arbitrary until GST, then bounded.
  - *Delay-free* `(Aᵢ, Zᵢ)`: messages arrive instantly.
- Replicas and clients separately considered.

## Definitions (paper's own)
- **`f`-safety / `f`-liveness**: standard, except with negligible-probability slack, against any adversary controlling `≤ f` replicas.
- **Definition 2 (`f`-finality)**: protocol satisfies `f`-safety under a *partially-synchronous* network.
- **Definition 3 (`fₐ`-accountable safety)**: whenever there is a safety violation, except with negligible probability,
  1. at least `fₐ` adversarial replicas are identified by a forensic algorithm as protocol violators, and
  2. no honest replica is identified.

## Main result (informal)
> **Accountable safety implies finality.** For any given protocol, if there exists an adversary strategy that leads to a safety violation under partial synchrony, then there exists an adversary strategy that leads to a safety violation but not enough adversary parties can be identified as protocol violators — *even if the network is delay-free.*

## Proof intuition
- The contrapositive: a protocol with delay-free accountable safety *cannot have* an adversary that violates safety under partial synchrony.
- "Even the weakest form of accountable safety, namely for delay-free networks, is still so strong that it implies finality."

## Implications connecting back to ABC^++ and Red Belly
- ABC^++ provides `(t_acc, B, J_rat)`-accountability — accountability with `t_acc = n − Θ(n)`, `B = Θ(λ)`. This implies that any protocol uplifted by ABC^++ *automatically* gains finality (in the partial-synchrony sense), without the protocol designer having to prove it directly. **This is a structural argument for accountability as the more fundamental property.**
- For Red Belly: DBFT was originally framed in terms of partial synchrony + agreement. Wrapping DBFT with ABC^++ → accountable DBFT → automatically `f`-final by this theorem. So Red Belly inherits finality "for free" from the accountability layer.

## Falsifier
- The theorem assumes the standard SMR model. Protocols outside SMR (e.g. payments without ledger structure, k-set agreement) may not benefit. But ABC^++ Definition 3 (easily accountable agreement) is exactly the class where this lift applies.
- Constants matter: `fₐ = 0` accountability is trivially true and does not imply finality. The result needs *nontrivial* `fₐ > 0` accountability for the implication to be meaningful — ABC^++ gets `fₐ = B_{δ,δ̂}^{ε,λ} ≈ λ/3`, which is `Ω(λ)`, nontrivial.
