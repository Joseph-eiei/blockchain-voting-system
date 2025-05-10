// src/components/CreateElection.jsx

import React, { useState, useContext } from "react";
import { EthersContext } from "../contexts/EthersContext";

export default function CreateElection({ onCreated }) {
  const { contracts } = useContext(EthersContext);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [candidates, setCandidates] = useState([{ name: "", metadataURI: "" }]);
  const [rawWhitelist, setRawWhitelist] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const addCandidate = () =>
    setCandidates((c) => [...c, { name: "", metadataURI: "" }]);
  const updateCandidate = (i, field, val) =>
    setCandidates((c) =>
      c.map((cand, idx) => (idx === i ? { ...cand, [field]: val } : cand))
    );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!contracts.em || !contracts.cm || !contracts.ballot) {
        throw new Error("Contracts not loaded");
      }

      // 1) parse dates to UNIX timestamps
      const startTs = Math.floor(new Date(startTime).getTime() / 1000);
      const endTs = Math.floor(new Date(endTime).getTime() / 1000);

      // 2) parse & lowercase whitelist CSV
      const whitelist = rawWhitelist
        .split(",")
        .map((a) => a.trim().toLowerCase())
        .filter((a) => a !== "");


      // 3) create election in EM (5-arg)
      const txE = await contracts.em.createElection(
        name,
        description,
        startTs,
        endTs,
        whitelist
      );
      const rcptE = await txE.wait();

      // 4) parse out ElectionCreated from raw logs
      const parsedE = rcptE.logs
        .map((log) => {
          try {
            return contracts.em.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((pl) => pl && pl.name === "ElectionCreated");
      if (!parsedE) throw new Error("ElectionCreated event not found");
      const electionId = Number(parsedE.args.id);

      // 5) mint & register each candidate
      for (const cand of candidates) {
        const txM = await contracts.cm.addCandidate(
          cand.name,
          "",
          cand.metadataURI
        );
        const rcptM = await txM.wait();
        const parsedM = rcptM.logs
          .map((log) => {
            try {
              return contracts.cm.interface.parseLog(log);
            } catch {
              return null;
            }
          })
          .find((pl) => pl && pl.name === "CandidateAdded");
        if (!parsedM) throw new Error("CandidateAdded event not found");
        const candidateId = Number(parsedM.args.id);
        await contracts.em.registerCandidateInElection(electionId, candidateId);
      }

      // 6) seed whitelist into Ballot for vote gating
      await contracts.ballot.addVoters(electionId, whitelist);

      // 7) reset form & notify parent
      setName("");
      setDescription("");
      setStartTime("");
      setEndTime("");
      setCandidates([{ name: "", metadataURI: "" }]);
      setRawWhitelist("");
      onCreated?.();
    } catch (err) {
      console.error(err);
      setError(err.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, border: "1px solid #ccc", marginBottom: 20 }}>
      <h2>Create New Election</h2>
      <form onSubmit={handleSubmit}>
        {/* Election meta */}
        <div>
          <label>Name:&nbsp;</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div>
          <label>Description:&nbsp;</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
          />
        </div>
        <div>
          <label>Start Time:&nbsp;</label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div>
          <label>End Time:&nbsp;</label>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        {/* Candidates */}
        <h3>Candidates</h3>
        {candidates.map((c, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <input
              placeholder="Name"
              value={c.name}
              onChange={(e) => updateCandidate(i, "name", e.target.value)}
              required
              disabled={loading}
            />
            &nbsp;
            <input
              placeholder="IPFS Metadata URI"
              value={c.metadataURI}
              onChange={(e) =>
                updateCandidate(i, "metadataURI", e.target.value)
              }
              required
              disabled={loading}
            />
          </div>
        ))}
        <button type="button" onClick={addCandidate} disabled={loading}>
          + Add Candidate
        </button>

        {/* Whitelist */}
        <div style={{ marginTop: 12 }}>
          <label>Voter Whitelist (comma-sep addresses):</label>
          <textarea
            rows={2}
            style={{ width: "100%" }}
            value={rawWhitelist}
            onChange={(e) => setRawWhitelist(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Submit */}
        <button type="submit" disabled={loading} style={{ marginTop: 12 }}>
          {loading ? "Creating…" : "Create Election"}
        </button>

        {error && <p style={{ color: "red" }}>{error}</p>}
      </form>
    </div>
  );
}
