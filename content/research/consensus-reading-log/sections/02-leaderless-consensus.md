---
title: "Leaderless Consensus"
---

<details>
<summary>Randomized Binary Consensus</summary>

The purpose of this consensus is solving a statement as below:

> Can we still get consensus in a fully asynchronous network, even when Byzantine nodes are present, and still guarantee termination?

The answer from the deterministic world is no. In a purely asynchronous system, deterministic consensus cannot guarantee termination.
This is the classic [FLP impossibility result](https://groups.csail.mit.edu/tds/papers/Lynch/jacm85.pdf), which already holds even with only one crash failure.
In shortt, an adversary can keep delaying messages in a way that prevents the protocol from forcing progress forever.

So if we still want termination, we need to add one more ingredient: a **Common Coin**.

> Of course, this is not the only way people get around the impossibility. There are many protocols that add extra structure or extra assumptions. Here we only focus on one representative direction, through the paper [_Signature-Free Asynchronous Byzantine Consensus_](papers/consensus/signature_free_asynchronous_byzantine.pdf).

The target of the algorithm is **Binary Byzantine Consensus**.\
Each correct process starts with an input `est ∈ {0,1}`.
You can think of that bit as a local vote on whether the proposed block should move toward `1` or `0`. (`1` is accept from a node, `0` is reject).
Consensus then runs in repeated rounds until every correct process eventually decides the same bit, with probability `1`.

At a very high level, each round has three layers:

1. `BV-broadcast` filters which binary values are even allowed to survive the round.
2. `AUX` makes processes exchange one justified value from that filtered set.
3. the common coin breaks ties when the system is still split.

### An Extra Assumption: Common Coin

The algorithm starts with **one crucial assumption**.
There is a function `random(r)` such that:

- in round `r`, every correct process gets the same bit `s_r`;
- that bit is either `0` or `1`;
- and Byzantine nodes cannot know `s_r` early enough to schedule the network against it forever.

This is why it is called **common coin** xD.\
If Byzantine nodes knew the coin result in advance, then in split rounds they could delay exactly the messages that would make correct processes converge toward that result. (We will have an illustrated example in the last section)\

### BV-broadcast

`BV-broadcast` is the broadcast abstraction this paper introduces for binary values.
Its role is to make sure that a value broadcast only by Byzantine processes is never delivered to correct processes.

The pseudo-algorithm is essentially:

```javascript
BV_broadcast(v):
    broadcast B_VAL(v)

on receipt of B_VAL(v) from t+1 distinct processes:
    if I have not yet broadcast B_VAL(v):
        broadcast B_VAL(v)

on receipt of B_VAL(v) from 2t+1 distinct processes:
    bin_values := bin_values ∪ {v}
```

Here are the main two thresholds:

- `t+1` means at least one sender must be correct, because there are at most `t` Byzantine processes.
- `2t+1` means at least `t+1` of those senders are correct, so the value will keep spreading until all correct processes can eventually deliver it.

From here, `BV-broadcast` gives four useful properties.

#### Justification:

If a correct process puts `v` into `bin_values`, then some correct process must have broadcast `v`.

**Proof**:
Because entering `bin_values` requires `2t+1` copies of `B_VAL(v)`.
At most `t` of those can be Byzantine, so at least `t+1` are correct.

#### Obligation:

If `t+1` correct processes `BV-broadcast(v)`, then eventually every correct process puts `v` into `bin_values`.

**Proof**:
Once `t+1` correct processes have sent `B_VAL(v)`, every correct process will eventually receive enough copies to echo it (From the code: line 4 and line 5).
After that, the value keeps spreading until the `2t+1` threshold is reached everywhere.

#### Uniformity:

If one correct process delivers `v`, eventually every correct process delivers `v`.

**Proof**:
Delivering `v` already implies that enough correct senders support `v`.
Those correct senders keep forwarding `v`, so the same support eventually reaches all correct processes.

#### Termination:

Every correct process eventually gets a non-empty `bin_values`.

**Proof**:
Among the `2t+1` correct processes, at least `t+1` of them must start the round with the same estimate value, either `0` or `1`.
Call that value `v`.

So at least `t+1` correct processes `BV-broadcast(v)` from the start.
By the rule at line 4, every correct process that receives those `t+1` copies will also broadcast `B_VAL(v)`.
This means `v` will keep spreading among correct processes.

Since there are `2t+1` correct processes in total, and all of them eventually broadcast `B_VAL(v)`, every correct process will eventually receive `2t+1` copies of `B_VAL(v)`.
Then by line 5, every correct process eventually adds `v` to `bin_values`.
So `bin_values` eventually becomes non-empty at every correct process.

### The Algorithm

After `BV-broadcast`, the consensus round itself looks like this:

```text
repeat each round r:
  BV_broadcast EST[r](est)
  wait until bin_values[r] is non-empty

  broadcast AUX[r](w), where w ∈ bin_values[r]

  wait for n-t AUX messages whose carried values are included in bin_values[r]
  values := set of values from those AUX messages

  s := common_coin(r)

  if values = {v}:
      if s = v:
          decide(v)
      est := v
  else:
      est := s
```

The logic is cleaner than it first looks.

- `BV-broadcast` decides which values are justified enough to survive.
- `AUX` makes each process commit to one value from that justified set.
- `values` is then the local summary of what survived the round.
- the coin only matters when the system is still split.

There are only two important cases.

#### Case 1: `values = {v}`

If a correct process sees a singleton set `{v}`, then that process knows the round has essentially converged to one value.
In that case:

- it keeps `est := v`;
- and if the common coin also returns `v`, it decides `v`.

There is also an important consistency fact here:
two correct processes cannot see different singleton sets in the same round.
So one correct node cannot have `values = {0}` while another has `values = {1}`. (From the logic, all correct processes move to the same estimate for the next round).

#### Case 2: `values = {0,1}`

This is the split case.
No decision happens yet.
Instead, every correct process sets:

```text
est := common_coin(r)
```

Because the common coin is common, all correct processes move to the same estimate for the next round.
This is the step that gives convergence in the asynchronous case.

### Why termination goes to probability 1

The proof intuition is short.

Eventually, the protocol reaches one of two situations:

- correct processes already align on the same estimate;
- or they enter the mixed case `{0,1}` and the common coin forces them to align for the next round.

Once all correct estimates align to the same value `v`, the system becomes stable.
Correct processes no longer introduce the opposite value by themselves.
From that point on, each new round has probability `1/2` of deciding, because the common coin returns `v` with probability `1/2`.

So after:

- one aligned round, the probability of not deciding is at most `1/2`;
- two aligned rounds, at most `(1/2)^2`;
- `k` aligned rounds, at most `(1/2)^k`.

As `k -> ∞`, that probability goes to `0`.
So the probability of eventually deciding goes to `1`.

This is exactly why the paper can guarantee:

- agreement,
- validity,
- and eventual termination with probability `1`,

even in a fully asynchronous Byzantine model.

### Why the paper says the expected number of rounds is 4

The paper gives a stronger quantitative claim than just eventual termination:
the **expected number of rounds to decide is 4**.

The intuition is that there are really two phases:

- first, correct processes need to align on the same estimate;
- after that, each round decides with probability `1/2`.

Once the system is already aligned on some value `v`, the rest is easy to analyze.
Each new round is a Bernoulli trial:

- if the common coin returns `v`, the processes decide;
- otherwise, they stay aligned and try again next round.

So after alignment, the expected number of additional rounds is:

`1 / (1/2) = 2`

The remaining question is how long it takes to reach alignment in the first place.
The paper shows that this also takes expected `2` rounds.

So the total expectation becomes:

- expected `2` rounds to align,
- expected `2` more rounds to decide,

which gives a total expected number of `4` rounds.

### Why the coin must not be known in advance

Now we can see why the common coin assumption is so strict.

Suppose the system is split, so some correct processes are still closer to `0` and others to `1`.
If Byzantine nodes already know that the next common coin is `0`, they can try to delay exactly the messages that would help the `1` side collapse into `0` quickly, while selectively forwarding messages that keep the view inconsistent as long as possible.

So the adversary does not need to break correctness directly.
It only needs to keep the protocol from using the coin as a real symmetry breaker.

The case where this attack stops working is the aligned case.
Once all correct processes already hold the same estimate `v`, Byzantine scheduling is no longer enough to create a competing correct estimate out of nowhere.
At that point, the only remaining question is whether the common coin returns `v` in that round.

### Demo

The easiest way to see the algorithm is to watch the split case converge and then terminate.
The demo below shows:

- `E`: current estimate
- `B`: `bin_values`
- `A`: the `AUX` value sent
- `V`: the local `values` set
- `D`: decided value

The important behavior to watch is:

- when estimates are split, the coin can pull them into one common estimate;
- once estimates align, the system stays aligned;
- after that, each round has probability `1/2` of deciding.

=> Run the platform in a randomized case with 12 nodes for few times, we will see the total round ranging from 2-6.

<iframe
  src="randomized_consensus_ui.html"
  title="Randomized consensus demo"
  width="100%"
  height="834"
  style="display: block; width: 117.65%; max-width: none; border: 0; transform: scale(0.85); transform-origin: top left;"
  loading="lazy"
></iframe>

</details>

## DBFT

<details>
<summary>DBFT: Deterministic Leaderless Consensus</summary>

Randomized binary consensus solves liveness with a common coin. `DBFT` tries to solve the same problem without one. That single change ends up shifting the whole protocol:

> From full asynchrony to partial synchrony, and from probabilistic termination to deterministic termination.

In the randomized algorithm, liveness comes from:

- full asynchrony,
- `BV-broadcast`,
- `AUX`,
- and a **Common Coin**.

In `DBFT`, the safe binary core still looks very similar, but the common coin disappears. Instead, liveness now comes from:

- **Partial synchrony**,
- **Timers**,
- and a **Weak coordinator**.

So the real comparison is:

| Protocol                    | Liveness ingredient       | Network assumption |
| --------------------------- | ------------------------- | ------------------ |
| Randomized binary consensus | common coin               | fully asynchronous |
| DBFT                        | weak coordinator + timers | partial synchrony  |

### Model and Parameters

`DBFT` works with:

- `n` processes;
- up to `t` Byzantine processes;
- authenticated point-to-point channels, so a Byzantine process cannot impersonate another process;
- resilience condition `t < n/3`, equivalently `n >= 3t + 1`;
- no signatures;
- no randomization.

The paper uses the model:

```text
BAMP_n,t[t < n/3]
```

for the asynchronous Byzantine message-passing setting with `t < n/3`.
In that model, `DBFT` first gives only a **safe** binary consensus algorithm.
Safe here means:

- agreement,
- validity,
- but not guaranteed termination.

To get termination, DBFT adds eventual synchrony:

```text
BAMP_n,t[t < n/3, 3Synch]
```

The `3Synch` assumption means that after some unknown finite time, message delays and computation delays become bounded.
This is the point where `DBFT` leaves the fully asynchronous world of the previous paper.

The important thresholds are:

| Threshold | Meaning                                                                     |
| --------- | --------------------------------------------------------------------------- |
| `t + 1`   | at least one sender is non-faulty, so the value is not only Byzantine noise |
| `2t + 1`  | enough support to BV-deliver a value into `bin_values`                      |
| `n - t`   | enough AUX messages to ignore up to `t` faulty processes                    |

When `n = 3t + 1`, notice that:

```text
n - t = 2t + 1
```

So the familiar `2t+1` quorum appears again.

### The Safe Binary Core

The safe binary core is the part that looks most similar to randomized binary consensus.
Each process keeps:

- `est`: its current estimate, initially its proposal;
- `r`: the current asynchronous round;
- `bin_values[r]`: values delivered by `BV-broadcast` in round `r`;
- `values`: the set extracted from enough `AUX` messages.

The round looks like this:

```text
est := initial value
r := 0

repeat:
  r := r + 1

  BV_broadcast EST[r](est)
  wait until bin_values[r] is non-empty

  broadcast AUX[r](bin_values[r])

  wait for n-t AUX messages whose union forms a non-empty set values
  such that values ⊆ bin_values[r]

  b := r mod 2

  if values = {v}:
      est := v
      if v = b:
          decide(v)
  else:
      est := b
```

This is close to the previous algorithm, but two differences matter.

First, `DBFT`'s `AUX` message carries a **set**:

```text
AUX[r](bin_values[r])
```

In the randomized algorithm, `AUX` carries one chosen value:

```text
AUX[r](w), where w ∈ bin_values[r]
```

Second, `DBFT` does not use:

```text
s := random()
```

It uses deterministic round parity:

```text
b := r mod 2
```

So if `values = {0,1}`, the process moves to `0` in even rounds and `1` in odd rounds.
This gives a deterministic tie-breaker, but it is also exactly the weakness of the safe core:
the adversary can predict it.

### Why the safe core is not enough

This is the crucial point.
In randomized binary consensus, the split case:

```text
values = {0,1}
```

is resolved by the common coin.
The adversary cannot know the coin result early enough to keep fighting it forever.

In `DBFT`, the split case is resolved by a predictable rule:

```text
round 1 -> 1
round 2 -> 0
round 3 -> 1
...
```

So in a fully asynchronous setting, the adversary can keep scheduling messages against this rule forever.
Agreement and validity are still safe, but termination is no longer guaranteed.

That is exactly the point where `DBFT` has to change the model.

### Weak coordinator and timers

To get liveness back, `DBFT` adds:

- local timers;
- increasing timeout values;
- a rotating **weak coordinator**.

The weak coordinator for round `r` is:

```text
coord(r) = ((r - 1) mod n) + 1
```

So the coordinator rotates deterministically:

```text
round 1 -> P1
round 2 -> P2
round 3 -> P3
...
```

This is the most important design choice in the paper.
The coordinator is **not** a PBFT-style leader.
Processes do not wait for it before entering the round, and it cannot impose a value by itself.
It only suggests a value that helps everyone converge if the network is timely enough.

The live round now looks like this:

```text
BV-broadcast EST[r](est)
wait until bin_values[r] is non-empty
start / increase local timer

coord := ((r - 1) mod n) + 1

if I am coord:
    pick the first value w that entered my bin_values[r]
    broadcast COORD_VALUE[r](w)

wait until bin_values[r] is non-empty and timer expires

if valid COORD_VALUE[r](w) was received from coord
and w ∈ bin_values[r]:
    aux := {w}
else:
    aux := bin_values[r]

broadcast AUX[r](aux)

wait for n-t AUX messages
wait until a valid values set exists and timer expires

if multiple valid values sets exist
and one of them is aux:
    prefer aux

then run the same decision logic:
    b := r mod 2
    if values = {v}: est := v; decide if v = b
    else: est := b
```

The weak coordinator's job is only to help processes choose the same singleton set.
If it is slow or faulty, the round can still continue from local `bin_values`.
That is why the paper insists this is not a classic leader-based design.

The liveness intuition is then:

- after partial synchrony starts, message delays become bounded;
- timers eventually become large enough;
- eventually there is a round where the weak coordinator's value is received in time;
- correct processes then send compatible `AUX` sets;
- everyone converges to a singleton `values = {v}`;
- when the singleton matches `r mod 2`, they decide.

So `DBFT` trades the common coin for:

- eventual synchrony,
- timers,
- and a weak coordinator that helps convergence but does not lead the protocol in the PBFT sense.

### From binary consensus to blockchain values

The binary core only decides `0` or `1`.
But blockchains need to decide a full block, or at least a full proposal value.
This is where the paper starts becoming a direct precursor to `Red Belly`.

`DBFT` reduces multivalue consensus to many binary consensus instances.
Very roughly:

1. each process reliably broadcasts its proposal;
2. there is one binary consensus object per process, `BIN_CONS[k]`;
3. `BIN_CONS[k] = 1` means "process `Pk`'s proposal survives as a candidate";
4. after the binary objects decide, processes extract the chosen proposal from that candidate set.

The good-case latency is the part the paper highlights:

- all non-faulty processes propose the same valid value;
- reliable broadcast takes `3` message delays;
- the binary consensus fast path takes `1` more message delay;
- total is `4` message delays.

This is the part that makes `DBFT` important for the next step.
It is no longer just a binary consensus paper.
It is already thinking like a blockchain protocol.

### Why this modification matters

So for me, the reason to read `DBFT` right after randomized binary consensus is not just historical.
It shows exactly what has to change when we want to move from:

- a clean randomized asynchronous binary protocol,

to:

- a deterministic protocol that can actually be pushed toward a blockchain setting.

The main modification is therefore very specific:

- remove the common coin,
- accept partial synchrony,
- add timers and a weak coordinator,
- and keep the protocol leaderless in the sense that no classic leader controls the round.

That is the step that makes `DBFT` the real setup for `Red Belly`.
Without this step, the move from binary consensus to a deterministic leaderless blockchain protocol would feel much more abrupt.

</details>

## Redbelly Blockchain
