# Traceable Ring Signature (Fujisaki & Suzuki — PKC 2007 / IACR ePrint 2006/389)

**Source:** web-verified (no PDF downloaded — abstract-level + AVCP-usage-level note, per review scope).
**Links:** https://eprint.iacr.org/2006/389 , Springer LNCS 4450 (PKC 2007), DOI 10.1007/978-3-540-71677-8_13

## Why it matters here
This is **the cryptographic heart of AVCP**. AVCP (Cachin–Collins–Crain–Gramoli, ESORICS 2020)
uses traceable ring signatures (TRS) so that each process can sign its proposal/broadcast
messages *anonymously within the ring of n participants*, while still making **equivocation
detectable and attributable**.

## The primitive
A ring signature lets a signer sign on behalf of an ad-hoc set ("ring") of public keys without
revealing which ring member signed — no group manager, no setup, signer-chosen ring. Plain ring
signatures give *unconditional, unrestricted* anonymity, which is too strong for voting-style
applications (a voter could vote twice, undetected).

Fujisaki–Suzuki restrict this with a **tag** `L = (issue, pk_1, ..., pk_n)` — the ring plus a
context string (e.g., an election ID, or in AVCP a (consensus-instance, message-type) label).
Properties, w.r.t. one fixed tag:

1. **Anonymity (one signature per tag):** a single signature under tag L reveals nothing about
   which ring member produced it (computational anonymity).
2. **Linkability (same tag, same message):** two signatures by the same signer on the *same*
   message under the same tag are publicly detected as linked ("same signer"), but the signer
   stays anonymous.
3. **Traceability (same tag, different messages):** two signatures by the same signer on
   *different* messages under the same tag allow anyone to **compute the signer's public key**
   — the double-signer is exposed. This is the "double-vote = identity revealed" mechanism.
4. **Exculpability / unforgeability:** an honest signer who signs at most once per tag cannot
   be framed as a double-signer; non-members cannot forge.

Construction: discrete-log based, random-oracle model; the signature embeds a deterministic
pseudorandom "trace value" σ_i = H(L)^{x_i}-style component per signer per tag, so two
signatures with the same trace value but different messages leak the key via interpolation.
Signature size and verification cost are **O(n)** in the ring size — the main efficiency
bottleneck AVCP inherits (every message carries an O(n)-size signature, all-to-all).

## Semantics AVCP relies on
- One tag per (instance, step): an honest process signs exactly once per tag → stays anonymous.
- A Byzantine process that sends two *different* payloads for the same tag (equivocation /
  double-vote) is traced: any verifier extracts its public key and can discard/blame it.
- This replaces classic per-sender authentication in Bracha-style reliable broadcast: instead of
  "I know message m came from p_i", verifiers know "m came from *some* ring member, and that
  member cannot also send m' ≠ m for this slot without being exposed."

## Related variant: Unique Ring Signatures (Franklin & Zhang, FC 2013)
"Unique Ring Signatures: A Practical Construction", LNCS 7859 (Financial Cryptography 2013).
URS unify linkable and traceable ring signatures: each member can produce at most one valid
(accepted) signature per message/ring — the signature contains a *unique token* deterministic
in (key, message). AVCP cites the TRS line; URS is the closest sibling primitive and would give
similar double-vote detection. Applications named by both papers: anonymous e-voting, e-tokens,
whistle-blowing.

## Relevance assessment
- **High (same-approach):** AVCP's anonymity AND its safety-under-anonymity both reduce to TRS
  properties (anonymity + traceability + exculpability). Any critique of AVCP's efficiency
  (O(n) signature size ⇒ O(n^3)+ bits all-to-all) or its trust model (random oracle, DDH-style
  assumptions) starts here.
