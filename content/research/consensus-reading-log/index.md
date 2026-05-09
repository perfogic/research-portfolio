---
title: "Consensus Reading Log: From Classical BFT to Ethereum Finality"
subtitle: "A comparison-driven reading path from leader-based BFT to Ethereum finality, leaderless coordination, and future directions"
order: 2
---

I began studying consensus algorithms on April 5, 2026, starting from broad background reading in blockchain scalability and distributed systems. That first stage gave me a historical view of how consensus evolved, from classical formulations to modern blockchain-oriented designs.

After finishing that initial survey, I realized I wanted to go much deeper. By May 6, 2026, I had gone through twelve papers, nine of them in close, line-by-line reading and started building my own internal map of the area. This section captures that early understanding: leader-based BFT protocols, Ethereum’s roadmap toward faster finality, and leaderless BFT designs, including the ideas behind Red Belly.

I started with **leader-based consensus** because it gave me the clearest baseline for comparing view change, quorum structure, and fast-path finality.
From there, the path moved into **Ethereum finality**, where proposal and finality become more clearly separated and the assumptions shift from a closed committee to a public validator set. After that, I wanted a contrasting branch in **leaderless consensus**, where the protocol no longer depends on a single strong proposer path.
I end with **future reading directions** that extend the same questions into newer design spaces.

The figure below shows how this reading path branched over time:
![Consensus reading roadmap](assets/images/reading_mindmap.png)

## Let's start!!!

Before going into individual protocols, I want to start with a short “what is consensus?” section, so that readers who are newer to the area can still build the basic intuition needed for the rest of the page.
