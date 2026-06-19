# Accountability: Definition and Relationship to Verifiability (Küsters, Truderung, Vogt — CCS'10 / ePrint 2010/236)

**Local path:** `reaper-workspace/papers/kusters-accountability-2010-236.pdf`

## Why it matters here
The scalable-accountability paper explicitly **adopts the Küsters–Truderung–Vogt nomenclature** (cited as `[8]` in the paper proper for the judge/verdict framework — note the citation number reuse is paper-internal). Definition 3 (fair public judges, verdicts of the form `dis(D)`, individual accountability) is straight from KTV. This paper provides the **formal model-independent definition** that the BFT accountability line specialises.

## Core framework
- A protocol `P = (Σ, Ch, In, Out, {Πₐ}, {Π̂ₐ})` with agents `Σ`, channels `Ch`, possibly-dishonest programs `Πₐ`, honest programs `Π̂ₐ`.
- **Judge** `J` — an agent (which may itself be a protocol participant or an external observer) that publishes **verdicts** `ψ` of the form `dis(a)` (party `a` misbehaved) or boolean combinations thereof.
- **Accountability constraint** `(α ⇒ ψ₁ | … | ψₖ)`: when run `r ∈ α` (some goal not met), the judge must state at least one verdict `ψᵢ` from the disjunction.

## Two key sub-properties
- **Fairness**: `J` (almost) never blames protocol participants who are honest. Formally: for every instance `π` and every run `r` of `π`, if `J` states `ψ` then `π ⊨ ψ` (every verdict is realisable by some Byzantine behaviour).
- **Completeness / Goal-centred completeness**: if some desired goal of the protocol is not met in a run (due to misbehaviour), then `J` blames those participants who misbehaved (or at least one of them).
- **Individual accountability**: `J`'s verdict explicitly names *at least one* misbehaving party. Distinct from group accountability (which only blames a *set* containing a culprit).

## Where it's used in the scalable-accountability paper
- The "verdict" terminology — `dis(D)` — comes from here.
- The distinction between *fair* judges and *public* judges (using only publicly verifiable evidence) is KTV's.
- The notion of "individual accountability" (the form ABC++ targets, per the paper's footnote 1) is the strongest specialisation in KTV's hierarchy.
- The AUC framework `[20]` (Graf–Küsters–Rausch S&P'23) is the modern UC-friendly successor of KTV — same authors' tradition.

## Relationship to verifiability
KTV shows that **accountability ⊃ verifiability**: any accountable protocol is verifiable (a third party can verify whether the goal was achieved), but not vice versa. This explains why scalable-accountability's "publicly-verifiable evidence" is a *strictly stronger* property than "the protocol verifiably reached agreement."

## Significance
KTV gave the field a *vocabulary* (judge, verdict, fairness, completeness) flexible enough to specialise to many settings: e-voting (their case study), MPC, and — for our purposes — BFT consensus. The scalable-accountability paper's verbatim definitions (Section 3) are direct specialisations of this framework to *agreement violations* in a distributed system.
