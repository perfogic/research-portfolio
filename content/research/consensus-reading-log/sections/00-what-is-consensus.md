---
title: "What is consensus?"
---

In this section, I assume the reader already has a basic idea of what a blockchain is. The goal here is narrower: to explain what consensus is trying to solve, why forks appear, and which system assumptions shape the main protocol families that appear later in this reading log.

## 1. The nature of a blockchain network

A blockchain network does not have a single global view. Each node only has its own local view of the system, built from the messages and blocks it has received so far. Because communication is delayed, reordered, or even maliciously manipulated, different nodes can temporarily see different versions of history.

Imagining we have a blockchain network with 4 nodes `A`, `B`, `C`, `D`, and every node has the same state as below:

<img src="/assets/images/consensus/00/00.png" alt="00" width="360" />

Now assume `A` is the honest proposer for the next block. It proposes block `X` on top of block 3. Because of network latency, `A`, `B`, `D` receive `X` quickly, while `C` does not receive it in time. At this moment, the local views are already different:

<img src="/assets/images/consensus/00/01.png" alt="01" width="640" />

Assuming `C` waits for a long time, and decide to propose new block `Y` on top of block 3, now we will have a new chain with different branches:

<img src="/assets/images/consensus/00/02.png" alt="02" width="420" />

To keep the system consistent, nodes need a way to decide which branch they currently treat as canonical.
That is the job of a **fork choice rule**. When new information arrives and a node decides that another branch is better than the one it was following before, it may have to **reorganize** its chain, usually shortened to a **reorg**.
For example:

If a node is currently building on top of block `X`, but later switches to another branch and starts following block `Y` instead, this is called a **reorg**.

## 2. What consensus is solving

At a high level, a consensus protocol helps a blockchain system agree on one canonical history, even when the network is unreliable and some participants may fail or behave adversarially.

In the blockchain setting, this usually means honest nodes should eventually agree on:

- which blocks belong to the accepted history;
- the order in which transactions were processed;
- the resulting state of the system.

Consensus is meant to preserve that agreement even when some nodes are faulty.

There are two kinds of failure:

- **Crash Failure**: A node may stop responding, go offline, or fail to send messages in time.
- **Byzantine Failure**: A node may behave arbitrarily by lying, equivocating, sending contradictory messages, or otherwise trying to disrupt agreement.

## 3. Safety and liveness

A consensus protocol is usually expected to preserve two important properties: **safety** and **liveness**.

**Safety** means that nothing bad happens. In the blockchain setting, this means honest nodes should not accept two conflicting histories, and the system should not allow outcomes such as double spending./
In more classical consensus language, this side usually includes:

- **Validity**: any decided value should be valid.
- **Agreement**: no two correct nodes should decide differently.

**Liveness** means that something good eventually happens. In practice, this means the chain should keep making progress, and valid transactions should eventually be included instead of the system stalling forever./
In classical consensus language, this is the **Termination** side:

- **Termination**: every correct node should eventually decide.

These two properties are both important, but they are not always easy to preserve at the same time. Under unreliable network conditions, practical consensus protocols often have to make trade-offs between stronger safety and stronger liveness.

## 4. Long-chain consensus and BFT-type consensus

One useful distinction that helped me organize the area was between **Long-chain consensus** and **BFT-type consensus**.

### 4.1. **Long-chain consensus**

Temporary forks are expected as part of normal operation. As mentioned in the fork example above, different nodes may temporarily follow different branches of history.
The role of the protocol is then to use a **fork choice rule** to decide which branch should be treated as the canonical chain.

For example, Bitcoin follows the **longest chain** rule:

<img src="/assets/images/consensus/00/03.png" alt="03" width="640" />

Ethereum follows a heavier fork-choice rule, and I will discuss that in more detail in the **ethereum finality roadmap** section.

In general, long-chain consensus tends to prioritize **liveness**.
The chain keeps moving even under imperfect network conditions, but temporary forks and reorgs can happen as part of that design.

### 4.2. **BFT-type consensus**

The protocol usually prioritizes **safety**. Instead of allowing temporary forks as part of normal operation, it tries to keep all honest nodes on one agreed history through quorum rules, locking, and coordination between validators.

The main advantage is faster finality. The trade-off is that when network conditions are bad enough, these protocols may stop making progress instead of continuing with temporary forks.

For more details about BFT consensus, we will discuss in **leader-based consensus** and **leaderless consensus** sections.

## 5. Synchrony assumptions

If you have spent some time reading BFT papers, you have probably seen terms like **asynchronous** and **partially synchronous** many times. So what do they actually mean?

In a **synchronous** model, message delays are bounded and known well enough that the protocol can rely on timing directly. For example, if we assume a delay bound `Δ = 300ms`, then the protocol can safely set its waiting logic around that bound, knowing that honest messages should arrive within that time.

In an **asynchronous** model, there is no known upper bound on message delay. A slow message and a failed node can look indistinguishable for an arbitrarily long time.

This is also the setting where the famous [**FLP impossibility result**](https://doi.org/10.1145/3149.214121) appears: in a fully asynchronous system, deterministic consensus cannot be guaranteed in the presence of even a small amount of fault.

In **partial synchrony**, the network may behave asynchronously for some time, but eventually reaches a point where message delivery becomes stable enough for the protocol to make progress. This moment is usually referred to as **GST** (Global Stabilization Time). Before GST, the protocol should still remain safe, even if progress is slow or stalled. After GST, the protocol can recover liveness because the network behaves well enough again.

This distinction matters because a fully asynchronous network is much harder to handle. In that setting, deterministic consensus cannot be solved in the presence of even a small amount of fault. That is one reason why practical systems usually either:

- assume partial synchrony; or
- use randomization when they want progress in asynchronous settings.

This becomes important later in the reading path, especially when moving from leader-based BFT into randomized and leaderless designs.
