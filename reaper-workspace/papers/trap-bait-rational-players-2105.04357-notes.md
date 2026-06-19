# TRAP: The Bait of Rational Players to Solve Byzantine Consensus

**Authors**: Alejandro Ranchal-Pedrosa, Vincent Gramoli  
**Venue**: ACM AsiaCCS 2022  
**Local PDF**: `reaper-workspace/papers/trap-bait-rational-players-2105.04357.pdf`  
**arXiv**: 2105.04357

## Why It Matters

TRAP takes accountable consensus one step beyond "detect the guilty validators after disagreement." It turns the ability to generate proofs-of-fraud into an incentive mechanism.

The key idea:

```text
If a coalition tries to cause a fork/double-spend,
reward one coalition member for betraying the coalition
by revealing proofs-of-fraud.
```

This makes rational validators afraid to join a cheating coalition, because any member of the coalition may defect and claim the reward.

## Model

TRAP studies a mixed population:

- correct players: always follow the protocol;
- Byzantine players: arbitrary behavior;
- rational players: deviate if doing so increases utility.

The problem is **rational agreement**: solve consensus even when rational players may collude with Byzantine players to cause disagreement/double-spending.

The paper targets partial synchrony and proves robustness under:

```text
n > max(3k/2 + 3t, 2(k + t))
```

where:

- `k` = number of rational players;
- `t` = number of Byzantine players.

## Mechanism

TRAP builds on Polygraph/accountable consensus.

Polygraph gives:

```text
if disagreement occurs,
correct players eventually obtain proofs-of-fraud
against the deviating signers.
```

TRAP adds:

1. **Deposit**: each participant deposits stake.
2. **Reward**: one baiter who reveals valid proofs-of-fraud receives a reward.
3. **Baiting strategy**: a rational player may pretend to join a cheating coalition, wait until the coalition creates proof of disagreement, then reveal the proof.
4. **BFTCR phase**: a Byzantine Fault Tolerant Commit-Reveal protocol lets baiters commit/reveal proofs and selects one reward winner without a trusted third party.
5. **Punishment**: guilty coalition members lose deposits; reward is paid from slashed deposits, not from honest participants.

## Intuition

Without TRAP:

```text
Rational validators may collude if double-spending payoff > honest payoff.
```

With TRAP:

```text
Each rational validator worries that another coalition member will betray first.
If reward > individual double-spend payoff, betrayal dominates collusion.
```

This is similar to a prisoner-dilemma setup: the protocol creates incentives for rational coalition members to defect.

## Relation to Red Belly

The Redbelly blog describes TRAP as integrating accountable consensus with the first version of Red Belly Blockchain to automatically generate undeniable proofs of fraud, exclude guilty consensus participants, and use deposits/stake to compensate victims of double-spending.

Technically, TRAP depends on Polygraph-style accountability:

```text
signed conflicting consensus messages
  -> proofs-of-fraud
  -> identify guilty participants
  -> slash/exclude/reward baiter
```

## Difference From Polygraph / ABC / ABC++

Polygraph / ABC / ABC++ answer:

```text
If disagreement happens, who can be proven guilty?
```

TRAP answers:

```text
Can we make rational validators unwilling to even join the cheating coalition?
```

So TRAP is not mainly a new evidence mechanism. It is an incentive/game-theoretic wrapper around accountability evidence.

## Useful Mental Model

Accountability gives the police report.

TRAP pays an undercover coalition member to bring the police report before the crime pays.

In blockchain terms:

```text
double-spend coalition forms
  -> one rational member defects
  -> exposes signed fraud proof
  -> guilty validators are removed/slashed
  -> victim can be compensated from deposits
  -> future coalitions become unstable
```
