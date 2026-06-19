# Follow-up Work Citing AVCP (arXiv:1902.10010 / ESORICS 2020)

**Method:** Semantic Scholar citation API for arXiv:1902.10010 (queried 2026-06-11), cross-checked
with web search, author homepages (dcol.me, gramoli.github.io). Every entry below was returned by
the citation index or verified on the author's page — none are guessed.

**Headline:** the paper has a *small* verified citation footprint (~8 distinct citing works,
2021–2026). **No direct successor extends AVCP itself** (no "AVCP 2.0", no journal version, no
deployment paper). The authors' own later work pivoted to *accountability* (Polygraph/ABC line)
rather than anonymity.

## Verified citing papers

1. **Red Belly: A Secure, Fair and Scalable Open Blockchain** — Crain, Natoli, Gramoli.
   IEEE S&P 2021. DOI 10.1109/SP40001.2021.00087 (arXiv:1812.11747). Self-citation by the
   group; cites AVCP as related DBFT-family work. Already in workspace
   (`red-belly-evaluating-1812.11747-notes.md`).
2. **BFT in Blockchains: From Protocols to Use Cases** — X. Wang, S. Duan, J. Clavin, H. Zhang.
   ACM Computing Surveys 54(10s), 2022. DOI 10.1145/3503042. Survey; catalogs AVCP among
   privacy-aware BFT variants.
3. **Chirotonia: A Scalable and Secure e-Voting Framework based on Blockchains and Linkable Ring
   Signatures** — Russo, Fernández Anta, González Vasco, Romano. IEEE Int. Conf. on Blockchain
   2021. DOI 10.1109/Blockchain53845.2021.00065 (arXiv:2111.02257). Closest *same-goal*
   follow-up: anonymous voting on a blockchain using linkable (not traceable) ring signatures;
   cites AVCP as prior art for ring-signature-based anonymous voting in BFT settings.
4. **Holistic Verification of Blockchain Consensus** — Bertrand, Gramoli, Konnov, Lazić,
   Tholoniat, Widder. DISC 2022 (arXiv:2206.04489, DOI 10.48550/arXiv.2206.04489). Same group;
   formally verifies DBFT-family consensus (model checking); cites AVCP as a DBFT derivative.
   (An earlier unpublished draft "Compositional Verification of Byzantine Consensus", 2021, also
   appears in the index — same line of work.)
5. **SocChain: Blockchain with Swift Proportional Governance for Bribery Mitigation** —
   Tennakoon, Gramoli. arXiv:2207.02711, 2022 *(preprint; the published descendant of this
   governance line is "Blockchain Proportional Governance Reconfiguration", CCGrid 2023, which
   we did not verify as itself citing AVCP)*. Same group; governance/elections on Red Belly,
   cites AVCP in the voting-privacy context.
6. **DORA: Distributed Oracle Agreement with Simple Majority** — Chakka, Joshi, Kate, Tobkin,
   Yang. arXiv:2305.03903, 2023 *(preprint per Semantic Scholar; no peer-reviewed venue
   verified)*. Oracle agreement; cites AVCP among vector-consensus formulations.
7. **Attacking and Improving the Tor Directory Protocol** — Luo, Bhat, Nayak, Kate.
   IEEE S&P 2024. DOI 10.1109/SP54263.2024.00083 (arXiv:2503.18345). Uses Byzantine consensus
   to harden Tor's directory; cites AVCP — a pleasing inversion (AVCP assumes Tor; this paper
   secures Tor with consensus).
8. **Customizable Information Dispersal-Based Byzantine Broadcast With Communication
   Optimization Using Bloom Filters** — Tan, Chen, Liu. IEEE TDSC, 2026.
   DOI 10.1109/TDSC.2026.3663433. Byzantine broadcast optimization; cites AVCP among reliable
   broadcast variants.

## Explicit negative findings (verified absences)
- **Daniel Collins' PhD thesis** (EPFL 2024, advisor Vaudenay) is titled *"On the Theory and
  Practice of Modern Secure Messaging"* — secure messaging, **not** a continuation of AVCP.
  His later consensus work ("Juggernaut: Efficient Crypto-Agnostic Byzantine Agreement",
  EUROCRYPT 2025; "Scalable Accountable Byzantine Agreement and Beyond", IEEE S&P 2026 with
  Gramoli) is about crypto-agnosticism and *accountability*, not anonymity. (We did not verify
  whether these cite AVCP.)
- **No journal/extended version** of AVCP found; arXiv v2 (Apr 2020) + ESORICS 2020 (LNCS
  12308, DOI 10.1007/978-3-030-58951-6_7) remain the only versions.
- **No anonymity follow-up by Cachin, Crain, or the Red Belly group** found in 2020–2026
  searches; Red Belly's public research page still lists AVCP as a standalone result.
- Gramoli's publication page lists no other anonymity/anonymous-voting/vector-consensus paper.
