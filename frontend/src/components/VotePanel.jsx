// src/components/VotePanel.jsx
import React, { useState, useEffect, useContext } from "react";
import { EthersContext } from "../contexts/EthersContext";

export default function VotePanel({ electionId, ballot, candidateManager }) {
  const { contracts, signer } = useContext(EthersContext);

  const [candidates, setCandidates] = useState([]);
  const [eligible, setEligible]     = useState(false);
  const [hasVoted, setHasVoted]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

  // 1️⃣ Load candidate list
  useEffect(() => {
    if (!contracts.em) return;
    (async () => {
      try {
        const rawIds = await contracts.em.getElectionCandidates(electionId);
        const list = await Promise.all(
          rawIds.map(async (bn) => {
            const id = Number(bn);
            const c  = await candidateManager.getCandidate(id);
            return { id, name: c.name };
          })
        );
        setCandidates(list);
      } catch (e) {
        console.error(e);
        setError("Could not load candidates");
      }
    })();
  }, [contracts.em, candidateManager, electionId]);

  // 2️⃣ Check on-chain whitelist + registration
  useEffect(() => {
    if (!ballot || !contracts.vr || !signer) return;
    (async () => {
      try {
        const me     = await signer.getAddress();
        const okWL   = await ballot.eligible(electionId, me);
        const okReg  = await contracts.vr.isRegistered(me);
        setEligible(okWL && okReg);
      } catch (e) {
        console.error(e);
        setError("Eligibility check failed");
      }
    })();
  }, [ballot, contracts.vr, signer, electionId]);

  // 3️⃣ See if they’ve already voted
  useEffect(() => {
    if (!ballot || !signer) return;
    (async () => {
      try {
        const me    = await signer.getAddress();
        const voted = await ballot.hasVoted(electionId, me);
        setHasVoted(voted);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [ballot, signer, electionId]);

  // 4️⃣ Cast vote handler
  const handleVote = async (candidateId) => {
    setError("");
    setLoading(true);
    try {
      const tx = await ballot.connect(signer).vote(electionId, candidateId);
      await tx.wait();
      setHasVoted(true);
      alert("✅ Vote recorded!");
    } catch (err) {
      console.error(err);
      setError(err.reason || err.message || "Vote failed");
    } finally {
      setLoading(false);
    }
  };

  // 5️⃣ Render
  if (error) {
    return <p style={{ color: "red" }}>Error: {error}</p>;
  }
  if (!eligible) {
    return <p style={{ color: "crimson" }}>You are not eligible to vote in this election.</p>;
  }

  return (
    <div style={{ marginTop: 20, padding: 20, border: "1px solid #ddd" }}>
      <h3>Cast your vote</h3>
      {hasVoted ? (
        <p style={{ color: "green" }}>You’ve already voted.</p>
      ) : (
        candidates.map((c) => (
          <div key={c.id} style={{ margin: "8px 0" }}>
            <strong>{c.name}</strong>
            <button
              onClick={() => handleVote(c.id)}
              disabled={loading}
              style={{ marginLeft: 12 }}
            >
              {loading ? "Submitting…" : "Vote"}
            </button>
          </div>
        ))
      )}
    </div>
  );
}
