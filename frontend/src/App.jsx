// src/App.jsx
import React, { useContext, useState, useEffect } from "react";
import { EthersContext } from "./contexts/EthersContext";
import ConnectWallet   from "./components/ConnectWallet";
import CreateElection  from "./components/CreateElection";
import ElectionList    from "./components/ElectionList";

export default function App() {
  const {
    signer,
    contracts,
    connectWallet,
    disconnectWallet
  } = useContext(EthersContext);

  const [account,     setAccount]     = useState(null);
  const [owner,       setOwner]       = useState(null);
  const [elections,   setElections]   = useState([]);
  const [selected,    setSelected]    = useState(null);
  const [whitelist,   setWhitelist]   = useState([]);
  const [showDisconnect, setShowDisconnect] = useState(false);

  // helper to truncate an address
  const truncate = (addr) =>
    addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";

  // ─── Effects ────────────────────────────────────────────────────────────
  // 1) Track connected account
  useEffect(() => {
    if (!signer) return;
    signer.getAddress().then((a) => setAccount(a.toLowerCase()));
  }, [signer]);

  // 2) Read on-chain owner
  useEffect(() => {
    if (!contracts?.em) return;
    contracts.em.owner().then((o) => setOwner(o.toLowerCase()));
  }, [contracts?.em]);

  // 3) Load elections once EM is ready
  const loadElections = async () => {
    if (!contracts?.em) return setElections([]);
    const count = Number(await contracts.em.electionCount());
    const items = [];
    for (let i = 1; i <= count; i++) {
      const e = await contracts.em.getElection(i);
      items.push({
        id:          i,
        name:        e.name,
        description: e.description,
        startTime:   Number(e.startTime),
        endTime:     Number(e.endTime),
      });
    }
    setElections(items);
  };
  useEffect(() => {
    loadElections();
  }, [contracts?.em]);

  // 4) Reload whitelist when selection changes
  useEffect(() => {
    if (!contracts?.em || !selected) {
      setWhitelist([]);
      return;
    }
    (async () => {
      const wl = await contracts.em.getWhitelist(selected.id);
      setWhitelist(wl.map((a) => a.toLowerCase()));
    })();
  }, [contracts?.em, selected]);

  // ─── Early returns ──────────────────────────────────────────────────────
  if (!signer) {
    return (
      <div style={{ textAlign: "center", padding: "3rem" }}>
        <ConnectWallet onConnect={connectWallet} />
        <p>Please connect your wallet to continue.</p>
      </div>
    );
  }
  if (!contracts) {
    return (
      <div style={{ textAlign: "center", padding: "3rem" }}>
        <p>Loading contracts… please wait.</p>
      </div>
    );
  }

  // ─── Partition into Active vs Past ─────────────────────────────────────
  const now = Math.floor(Date.now() / 1000);
  const activeElections = elections.filter(
    (e) => now >= e.startTime && now <= e.endTime
  );
  const pastElections = elections.filter((e) => now > e.endTime);

  // ─── Main UI ────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 800, margin: "2rem auto", padding: "0 1rem" }}>
      {/* Header with title + connected badge */}
      <div
        style={{
          display:        "flex",
          justifyContent: "space-between",
          alignItems:     "center",
          marginBottom:   "1.5rem",
          position:       "relative"
        }}
      >
        <h1 style={{ margin: 0 }}>Blockchain Voting dApp</h1>

        {account && (
          <div
            onClick={() => setShowDisconnect((p) => !p)}
            style={{
              padding:      "0.3rem 0.6rem",
              background:   "#eef",
              borderRadius: 4,
              fontSize:     "0.9rem",
              fontFamily:   "monospace",
              cursor:       "pointer",
              userSelect:   "none"
            }}
          >
            Connected: {truncate(account)}
          </div>
        )}

        {showDisconnect && (
          <div
            style={{
              position:     "absolute",
              top:          "2.5rem",
              right:        0,
              background:   "#fff",
              border:       "1px solid #ccc",
              boxShadow:    "0 2px 6px rgba(0,0,0,0.1)",
              borderRadius: 4,
              padding:      "0.5rem",
              zIndex:       10
            }}
          >
            <button
              onClick={() => {
                disconnectWallet();
                setShowDisconnect(false);
                setSelected(null);
              }}
              style={{
                background:   "#f66",
                color:        "#fff",
                border:       "none",
                padding:      "0.5rem 1rem",
                borderRadius: 4,
                cursor:       "pointer"
              }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* Only owner can create elections */}
      {account === owner && (
        <CreateElection onCreated={loadElections} />
      )}

      {/* Active Elections */}
      <h2>📦 Active Elections</h2>
      {activeElections.length === 0 && <p>No active elections.</p>}
      <ElectionList
        elections={activeElections}
        selected={selected}
        onSelect={setSelected}
        account={account}
        owner={owner}
        whitelist={whitelist}
        ballot={contracts.ballot}
        candidateManager={contracts.cm}
      />

      {/* Past Elections */}
      <h2 style={{ marginTop: "2rem" }}>📦 Past Elections</h2>
      {pastElections.length === 0 && <p>No past elections.</p>}
      <ElectionList
        elections={pastElections}
        selected={selected}
        onSelect={setSelected}
        account={account}
        owner={owner}
        whitelist={whitelist}
        ballot={contracts.ballot}
        candidateManager={contracts.cm}
      />
    </div>
  );
}
