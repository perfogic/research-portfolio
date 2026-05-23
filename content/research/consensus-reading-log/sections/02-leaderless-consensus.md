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
function BV_broadcast(v):
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

```javascript
function bin_propose(vi):
  est = vi
  r = 0
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
        est := v // L0
    else:
        est := s // L1
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

```javascript
est := common_coin(r)
```

Because the common coin is common, all correct processes move to the same estimate for the next round.
This is the step that gives convergence in the asynchronous case.

### Termination goes to probability 1

Eventually, the protocol reaches one of two situations (See comments `L0` and `L1`):

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

### Expected rounds for termination is 4

There are really two phases:

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

### What if random coin is predicted by Byzantine nodes

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
  src="demos/randomized_consensus_ui.html"
  title="Randomized consensus demo"
  width="100%"
  height="834"
  style="display: block; width: 117.65%; max-width: none; border: 0; transform: scale(0.85); transform-origin: top left;"
  loading="lazy"
></iframe>

</details>

<details>
<summary>DBFT: Deterministic Leaderless Consensus</summary>

`DBFT` is a leaderless Byzantine consensus protocol for blockchains.\
It is based on the same basic idea as the randomized binary consensus algorithm we discussed above, which is to let processes complete asynchronous rounds as soon as they receive a threshold of messages, instead of waiting for a coordinator message that may be slow or faulty.

The main difference is in how liveness is achieved. The randomized binary algorithm uses a **common coin** to resolve split cases in a fully asynchronous setting.\
`DBFT` removes that **common coin** and instead moves to a deterministic path to convergence under partial synchrony by adding additional ingredients.

Before jumping into the difference, we will walk through each components it used. Start with `BV-Broadcast`.

### 1. BV-broadcast

This part is basically the same as in the randomized paper, we only remind the properties:

- `BV-Obligation`: if at least `t+1` non-faulty processes `BV-broadcast(v)`, eventually every non-faulty process puts `v` in `bin_values`.
- `BV-Justification`: if a non-faulty process has `v ∈ bin_values`, then some non-faulty process really broadcast `v`.
- `BV-Uniformity`: if one non-faulty process delivers `v`, eventually every non-faulty process delivers `v`.
- `BV-Termination`: every non-faulty process eventually gets a non-empty `bin_values`.

`BV-broadcast` is only a broadcast abstraction for binary values and its mission is to ensure that values supported only by Byzantine nodes do not survive as valid candidates.

### 2. Safe Binary Consensus Algorithm

Before seeing the full version of binary Byzantine consensus algorithm in `DBFT`, we will start with the simplified version.

**Pseudo code**:

```javascript
function bin_propose(val):
  est := val
  r := 0

  repeat:
    r := r + 1

    BV-broadcast EST[r](est)
    wait until bin_values[r] != ∅

    broadcast AUX[r](bin_values[r])

    wait until there exist n-t AUX messages
    whose union is values
    and values ⊆ bin_values[r]

    b := r mod 2 // Updated line

    if values = {v}:
        est := v // L0
        if v = b:
            decide(v)
    else:
        est := b // L1
```

The key difference from randomized binary consensus is **exactly one line**.

Before:

```javascript
values = {0,1} -> est := common_coin(r)
```

Now:

```javascript
values = {0,1} -> est := r mod 2
```

We can realize that the algorithm doesn't use the unpredictable shared bit. This core only offer safety, but not liveness.
The main purpose is to keep the safety, open the road for changing from probabilist termination to deterministic termination.

Let's dive a bit about the safety, which are two properties: `Validity` and `Agreement`.

#### Validity

If all correct processes start with the same value `v`, then only `v` can ever be decided.

**Proof**:\
Let's recap: By `BV-Justification`, a value can enter `bin_values` only if some correct process broadcast it.\
If all correct processes start with the same value `v`, `v` will be echoed by `n - f` correct processors. This means there are only `f` Byzantine processors, who can produce `1 - v`.\
However to enter `bin_values`, we need `f+1` threshold for every correct processors starting echo the value `1-v`, then it will reach `n - f` to meet the threshold.\
However, this case never happens because we have only `f` values for `1 - v`.

#### Agreement

No two correct processes can decide different values.

**Proof**:\
Suppose `r` is the first round where some correct process decides `v`.\
To decide, it must have:

```javascript
values = {v}
and v = r mod 2
```

Now take any other correct process in the same round.

If it also sees a singleton set, then it cannot be `{1-v}`.\
The reason is that two correct processes cannot see two different singleton sets in the same round.\
So if it sees a singleton, it must also be `{v}`, and then it decides the same value `v`.

If it does not see a singleton, then the only remaining case is:

```javascript
values = {0,1}
```

and the algorithm updates:

```javascript
est := r mod 2 = v
```

So after round `r`, every correct process is in one of two states:

- either it already decided `v`;
- or it carries estimate `v` into round `r+1`.

From that point, correct processes no longer re-introduce `1-v`.\
So no later round can lead a correct process to decide a different value.

#### Why termination is not guaranteed

Termination does not follow in the fully asynchronous model.

**Proof intuition**:\
The issue appears exactly at these two lines:

```javascript
if values = {v}:
    est := v // L0
else:
    est := r mod 2 // L1
```

These two branches `L0` and `L1` update the next estimate in two different ways.

If a correct process sees a singleton set such as `{0}` or `{1}`, it keeps that value for the next round.\
If it sees the mixed set `{0,1}`, it follows the deterministic rule `r mod 2`.

Now the problem is that `r mod 2` is fully predictable.\
Unlike the randomized algorithm, there is no common coin here to force all correct processes toward one unpredictable direction.

Since the network is still fully asynchronous, a Byzantine adversary can delay messages so that correct processes do not all enter the same branch at the same time.
One group may already see a singleton set and keep that value, while another group is still delayed enough to see `{0,1}` and follow `r mod 2` instead.

So the system can keep revisiting the split case without any mechanism that forces convergence.\
Safety still holds, but liveness is no longer guaranteed.

### 3. Safe and Liveness Binary Consensus Algorithm

The safe core above still has no liveness guarantee.
To recover liveness, `DBFT` keeps the same binary structure and adds three things:

- partial synchrony;
- local timers;
- and a weak coordinator.

The weak coordinator of round `r` is:

```javascript
coord(r) = r mod n
```

It is not a PBFT-style leader.
Processes do not wait for it before starting the round, and it cannot force a value by itself.
Its only role is to help many correct processes send the same `AUX` value once the network becomes timely.

The full live version then looks like this:

```javascript
function bin_propose(val):
  r := 0
  timeout := 0

  repeat:
    r := r + 1

    BV-broadcast EST[r](val)
    wait until bin_values[r] != ∅
    timeout := timeout + 1
    start timer(timeout) // if this round fails, the next round waits longer

    if I am the coordinator of round r:
        wait until bin_values[r] = {w}
        broadcast COORD[r](w) // suggest one justified value, to enhance convergence

    wait until bin_values[r] != ∅ and timer expired

    if coordinator value c was received and c ∈ bin_values[r]:
        e := {c} // follow the coordinator hint
    else:
        e := bin_values[r] // fall back to the local view

    broadcast AUX[r](e)

    wait until AUX[r](·) has been received from n-f different processes
    start timer(timeout) // give slow nodes time to catch up

    wait until there exists a set s extracted from AUX messages such that:
        every value seen in AUX from n-f processes belongs to s
        and every value in s already belongs to bin_values[r]
        and timer expired

    if s = {v}:
        val := v
        if v = r mod 2 and not decided yet:
            decide(v)
    else:
        val := r mod 2

    if decided in round r-2:
        exit() // leave two rounds later, so slower correct nodes can still catch up
```

The decision rule at the end is still the same as in the safe asynchronous version:

```javascript
if s = {v}:
    val := v
    if v = r mod 2:
        decide(v)
else:
    val := r mod 2
```

The real change happens before `AUX`.

- each round now has a timer, and the timeout grows round by round;
- round `r` now has a weak coordinator;
- if the coordinator quickly sees `bin_values[r] = {w}`, it broadcasts `COORD[r](w)`;
- if a process receives that value in time, and the same value is already in its own `bin_values[r]`, then it sends `AUX[r]({w})`;
- otherwise, it still sends `AUX` from its own local view.

So the coordinator does not force the system onto a value.
It only tries to make many correct processes send the same singleton `AUX` in the same round.

That is why the paper calls it a weak coordinator.
If the coordinator is slow or Byzantine, the protocol still continues from the local `bin_values[r]`.
If the coordinator is correct and its message arrives before the timer expires, then many correct processes send `AUX[r]({w})`, and that is what pulls the system out of the split case.

#### How liveness is ensured

Before synchrony, the timer may still be too small, so the coordinator message can arrive too late to help. In that case, the protocol still falls back to the local `bin_values[r]` path.

The liveness argument starts only after the network becomes timely.
At that point, timeout values keep increasing round by round, so eventually there is a round where:

- the weak coordinator is correct;
- its `COORD[r](w)` message arrives before the timer expires;
- and every correct process already has `w ∈ bin_values[r]`.

Then every correct process takes the same branch:

```javascript
e := {w}
```

and broadcasts the same singleton `AUX[r]({w})`.
Once `n-f` such messages are received, every correct process can build the same set:

```javascript
s = { w };
```

From that point, the split case is gone.
The protocol is back in the easy case:

- if `w = r mod 2`, they decide in that round;
- otherwise, they all keep `val := w`, and decision follows in one of the next two rounds.

### 4. DBFT in Blockchain Consensus

This section describes how dBFT can be applied into real-world blockchain.
I will illustrate them with 4 proposers, each proposer wants to propose different blocks.
<img src="/assets/images/consensus/01/03.png" alt="03" width="720" />

Firstly they will run `Binary Consensus Algorithm` with each blocks.

Secondly, every proposer will join to vote for every blocks A,B,C,D. Each process will continue for a few rounds before finally deciding the result.

Finally, once it has the result, it will select the valid block from proposer with lowest index.

![alt text](/assets/images/consensus/01/04.png)

This will be a demo for you to play around with it for familarity:

<iframe
  src="demos/dbft_multivalue_reduction_ui.html"
  title="DBFT applied blockchain consensus demo"
  width="100%"
  height="834"
  style="display: block; width: 117.65%; max-width: none; border: 0; transform: scale(0.85); transform-origin: top left;"
  loading="lazy"
></iframe>

</details>

<details>
<summary>Redbelly Blockchain</summary>

`Redbelly Blockchain` starts from the same `DBFT` binary consensus core, but changes the target completely.
`DBFT` with multivalue consensus still ends by picking one surviving proposal.
`Redbelly` does not stop there.
Instead of picking one surviving proposal like `DBFT`, it keeps multiple surviving proposals as **sub blocks**, then combines them into one final **superblock**.

![alt text](/assets/images/consensus/01/05.png)

<iframe
  src="demos/red_belly_superblock_ui.html"
  title="Redbelly superblock demo"
  width="100%"
  height="834"
  style="display: block; width: 117.65%; max-width: none; border: 0; transform: scale(0.85); transform-origin: top left;"
  loading="lazy"
></iframe>

Just remind again:

- `DBFT` uses binary consensus to decide which proposal survives;
- `Redbelly` uses binary consensus to decide which proposal indices survive, then reconciles them together.

Now, we go deeper into the changes:

- a verified reliable broadcast for proposals;
- a bitmask built from many binary consensus instances;
- and a reconciliation step that extracts one deterministic superblock.

### 1. Verified reliable broadcast

Before proposers can be reconciled together, `Redbelly` first changes the broadcast layer.
Instead of using a plain reliable broadcast, it uses a **verified reliable broadcast**.

The easiest way to see this change is to recall the plain reliable broadcast first.
In the plain version:

- the proposer sends `INIT(v)`;
- receivers echo that proposal to others;
- once enough matching echoes are seen, nodes broadcast `READY`;
- and once enough matching `READY` messages are seen, the proposal is delivered.

`Redbelly` keeps the same overall shape, but changes two things.

First, after the full proposal `v` is sent once in `INIT`, later phases mostly exchange its hash `h(v)` instead of resending the whole proposal.
The reason is simple: proposals can be large, so it is much cheaper to confirm agreement on the digest than to rebroadcast the full content every time.

Second, `READY` no longer means only "I saw this proposal".
It also carries the verification result for that proposal.
So the protocol is not just agreeing on which proposal was sent, but also on which transactions inside it are valid.

The algorithm is:

```javascript
verified_reliable_broadcast(v):
  broadcast INIT(v)

  upon receiving INIT(v) from proposer j:
      broadcast ECHO(h(v), j)

  upon receiving n-f ECHO(h(v), j) and READY not yet sent:
      if I am a primary verifier of v:
          verif := verify(v)
      if I am a secondary verifier of v:
          wait(Δ)
          verif := verify(v)
      broadcast READY(verif, h(v), j)

  upon receiving f+1 READY(verif, h(v), j) and READY not yet sent:
      stop_verify(v)
      broadcast READY(verif, h(v), j)

  upon receiving n-f READY(verif, h(v), j) and proposal j not yet delivered:
      if is_verified(v, verif):
          deliver(v, j)
```

There are two details here that matter.

The first is the hash exchange.

- `INIT` still carries the full proposal `v`;
- but `ECHO` carries only `h(v)`;
- and `READY` also carries `h(v)`, not the full proposal again.

So the network agrees on one digest, while the actual proposal content only needs to be sent once.

The second is what happens before `READY`.
Once a node receives `n-f` matching `ECHO(h(v), j)` messages, verification starts.
Primary verifiers start immediately.
Secondary verifiers wait for `Δ`, and only help if needed.

After verification finishes, the node broadcasts:

```javascript
READY(verif, h(v), j);
```

Here `verif` is not just a boolean.
It encodes which transactions inside the proposal are invalid.
So by the time a proposal is finally delivered, the protocol already knows how that proposal should be filtered.

There is also one more optimization.
If a node receives `f+1` matching `READY` messages before it has sent `READY` itself, it stops its own verification work and simply rebroadcasts that `READY`.
This avoids wasting verification effort once enough agreement is already visible in the network.

So the real change in this layer is:

- use hashes to reduce communication;
- use verifier sets to split signature checking;
- and piggyback the verification result inside `READY`, so delivery already comes with validation.

### 2. From proposals to a bitmask

Once proposals are being delivered in the background, `Redbelly` runs one binary consensus instance per proposer.
This is the `propose(val)` algorithm in the paper.

```javascript
propose(val):
  verified_reliable_broadcast(val) -> props
  start timer(age of oldest tx in mempool)

  while |{k : bitmask[k] = 1}| < |P| - f or timer did not expire:
      for every k such that props[k] has been delivered:
          bitmask[k] := bin_propose_k(1)

      for every k such that props[k] has not been delivered:
          bitmask[k] := bin_propose_k(0)

  wait until bitmask is full and every index with bitmask[ℓ] = 1 has props[ℓ] delivered
  reconciliate(bitmask & props)
```

The logic is:

- if proposer `k`'s proposal has already been delivered, vote `1` in binary instance `k`;
- if it has not been delivered yet, vote `0` there;
- run all those binary instances in parallel;
- the outputs together form a `bitmask`.

So unlike `DBFT`, the binary layer is no longer selecting one winner directly.
It is building a set of surviving proposal indices.

The timer here also has a different role from the binary `DBFT` timer.
It is tied to the age of the oldest transaction in the mempool, so old transactions are not postponed forever while the protocol waits for more proposals to arrive.

### 3. Reconciliation into a superblock

Once every correct proposer has the same bitmask, they still do not necessarily have the same local `props` array yet.
So each proposer waits until every index marked with `1` in the bitmask has actually been delivered locally.

After that, they run reconciliation:

```javascript
reconciliate(props):
  superblock := ∅

  for i = 0 .. n-1:
      for tx in props[(k + i) mod n]:
          for ctx in superblock:
              if not conflict(tx, ctx):
                  superblock := superblock ∪ {tx}

  decide(superblock)
```

This is where `Redbelly` really departs from `DBFT`.
The output is no longer one proposal.
It is one **superblock** made from many proposals.

The reconciliation is deterministic:

- all correct nodes use the same bitmask;
- all of them wait for the same delivered proposal set;
- all of them traverse proposals in the same order;
- and all of them apply the same conflict rule.

So they all end up with the same final superblock.

The paper also adds one fairness detail here.
The traversal order is rotated by the index `k` of the latest committed superblock, so the lowest proposer index does not always get priority when transactions are added first.

### 4. What Redbelly improves over DBFT

At this point the difference is clearer.

- `DBFT` uses binary consensus to pick one surviving proposal.
- `Redbelly` uses binary consensus to keep many proposals alive at once.
- `DBFT` stops after multivalue selection.
- `Redbelly` adds verified broadcast and reconciliation to turn that set into one superblock.

This is why `Redbelly` improves throughput.
Instead of throwing away all but one proposal, it can commit transactions coming from many proposers in the same consensus instance.

</details>
