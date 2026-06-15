---
title: "Week 0 Update"
program: "Ethereum Protocol Fellowship Cohort 7"
phase: "Discovery"
week: 0
year: 2026
date: "2026-06-15"
tag: "week-0"
---

# Dang(Daniel) Pham Minh Week 0 Update

Coming into EPF Cohort 7, I'm participating permissionlessly and using Week 0 to get oriented around the proposed projects.

My focus so far has been learning more about Lean Ethereum and the client-side architecture around Ream, then mapping that learning back to the areas where I may be able to contribute.

## Background

I already have some background in Data Availability Sampling and recently worked on a DAS-related paper, namely CDA. I have also become increasingly interested in the consensus space.

Because of that, I am trying to connect my research background with practical client implementation work. I decided to join this cohort because it gives me a chance to contribute to interesting protocol projects while learning from people who are already working close to the core Ethereum stack.

I started this journey by learning about the Lean client direction, which is part of Ethereum's roadmap around fast finality and post-quantum security.

During the first week, I watched the EPF Lean Introduction videos:

- [Lean Introduction 1](https://www.youtube.com/watch?v=myz54GOqgQk)
- [Lean Introduction 2](https://www.youtube.com/watch?v=Dad2UonQ9Ag)
- [Lean Introduction 3](https://www.youtube.com/watch?v=BWvThjrjTmw)

The session from Justin Drake gave me the most insight, and Nicolas asked several useful questions that helped clarify the surrounding design space.

I also watched Ream's Lean Architecture video:

- [Ream Lean Architecture](https://www.youtube.com/watch?v=E4eLOjI6Ou8&t=1s)

The Ream architecture session, given by Kodby ML, helped me understand how the client is structured. I believe this is still a new and fast-moving space, and it feels like a good opportunity to apply my skills in a more practical setting.

## Areas I'm Looking Into

Right now, I am testing and reading through networking-related libraries such as `discv5` and `libp2p`. This is partly to refresh the networking-layer details and partly to build enough groundwork before I start touching and modifying the `ream` codebase.

The proposed projects that currently look most aligned with my background are:

- **Ream: Minimal DAS**. This is the closest match to my DAS background and gives me a path to connect previous research work with Ethereum client implementation.
- **Ream: Execution Layer**. I want to understand how Ream is structured end to end and where execution-layer integration work fits into the project.

I also plan to look further into:

- **Grandine: Lean Client**. This is another project that could be relevant as I compare different client implementations and their approach to the Lean Ethereum direction.

For now, I will focus on reading the `ream` client, understanding how a DAS scheme could be applied to it, and thinking about a generic approach that could work for both the Beacon chain with KZG and the Lean chain with FRI.

## Working Through

My main task now is to read the Ream repository carefully, understand its architecture, and identify the parts where I can contribute realistically. I am also continuing to review the EPF material around Lean Ethereum, networking, and client architecture so that I can narrow my focus before moving deeper into a specific project.

Next, I plan to read through Thomas Coratger's Lean Consensus 2026 plan and take an initial look at `leanSpec`, the Lean Ethereum specifications repository.

## Links

- [EPF Lean Introduction 1](https://www.youtube.com/watch?v=myz54GOqgQk)
- [EPF Lean Introduction 2](https://www.youtube.com/watch?v=Dad2UonQ9Ag)
- [EPF Lean Introduction 3](https://www.youtube.com/watch?v=BWvThjrjTmw)
- [Ream Lean Architecture](https://www.youtube.com/watch?v=E4eLOjI6Ou8&t=1s)
- [Lean Consensus: 2026 Planning](https://hackmd.io/@tcoratger/ryS1ElrWbx#)
- [leanEthereum/leanSpec](https://github.com/leanEthereum/leanSpec)
