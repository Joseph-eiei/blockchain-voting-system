// src/components/VotePanel.jsx
import React, { useState, useEffect, useContext } from "react";
import { EthersContext } from "../contexts/EthersContext";

export default function VotePanel({ electionId, ballot, candidateManager }) {
  const { contracts, signer } = useContext(EthersContext);

  // which candidate the user has selected
  const [selectedId, setSelectedId] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [eligible, setEligible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tokenBalance, setTokenBalance] = useState(0n);

  // 1️⃣ Load candidate list
  useEffect(() => {
    if (!contracts.em) return;
    (async () => {
      try {
        const rawIds = await contracts.em.getElectionCandidates(electionId);
        const list = await Promise.all(
          rawIds.map(async (bn) => {
            const id = Number(bn);
            const c = await candidateManager.getCandidate(id);
            return { id, name: c.name, description: c.description };
          })
        );
        setCandidates(list);
      } catch (e) {
        console.error(e);
        setError("Could not load candidates");
      }
    })();
  }, [contracts.em, candidateManager, electionId]);

  // 2️⃣ Check whitelist eligibility and token availability
  useEffect(() => {
    if (!ballot || !contracts.vr || !signer) return;
    (async () => {
      try {
        const me = await signer.getAddress();
        // Adjust eligibility check to check token balance instead of whitelist
        const bal = await contracts.vr.balanceOf(me, electionId);
        setEligible(bal > 0n);
      } catch (e) {
        console.error(e);
        setError("Eligibility check failed");
      }
    })();
  }, [ballot, contracts.vr, signer, electionId]);

  // 3️⃣ Load voting token balance
  useEffect(() => {
    if (!contracts.vr || !signer) return;
    (async () => {
      try {
        const me = await signer.getAddress();
        const bal = await contracts.vr.balanceOf(me, electionId);
        setTokenBalance(bal);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [contracts.vr, signer]);

  // 5️⃣ Cast vote handler
  const handleVote = async (candidateId) => {
    setError("");
    setLoading(true);
    try {
      const tx = await ballot.connect(signer).vote(electionId, candidateId);
      await tx.wait();
      alert("✅ Vote recorded!");
      setEligible(false);
    } catch (err) {
      console.error(err);
      setError(err.reason || err.message || "Vote failed");
    } finally {
      setLoading(false);
    }
  };

  // 6️⃣ Render UI
  if (error) {
    return <p style={{ color: "red" }}>Error: {error}</p>;
  }
  if (!eligible) {
    return <p style={{ color: "crimson" }}>You are not eligible to vote in this election.</p>;
  }


  return (
    <div style={{ marginTop: 20, padding: 20, border: "1px solid #ddd" }}>
      <p>Your Voting Tokens: {tokenBalance.toString()}</p>
      <h3>Cast your vote</h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        {candidates.map((c) => (
          <label
            key={c.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              border: '1px solid #ccc',
              borderRadius: 8,
              padding: '0.75rem',
              cursor: 'pointer',
              background: selectedId === c.id ? '#e6f7ff' : '#fff',
            }}
          >
            <input
              type="radio"
              name="candidate"
              value={c.id}
              checked={selectedId === c.id}
              onChange={() => setSelectedId(c.id)}
              style={{ marginRight: 8, marginTop: 2 }}
            />
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{c.name}</div>
              <div style={{ fontSize: '0.9rem', color: '#555' }}>
                {c.description}
              </div>
            </div>
          </label>
        ))}
      </div>
      <button
        onClick={() => handleVote(selectedId)}
        disabled={!selectedId || loading}
        style={{
          marginTop: '1rem',
          padding: '0.5rem 1rem',
          border: 'none',
          borderRadius: 4,
          background: '#1890ff',
          color: '#fff',
          cursor: selectedId && !loading ? 'pointer' : 'not-allowed',
        }}
      >
        {loading ? 'Submitting…' : 'Vote'}
      </button>
    </div>
  );
}
