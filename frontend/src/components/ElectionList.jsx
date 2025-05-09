// src/components/ElectionList.jsx
import React from "react";
import VotePanel    from "./VotePanel";
import ResultsPanel from "./ResultsPanel";

export default function ElectionList({
  elections,
  selected,
  onSelect,
  account,
  owner,
  whitelist,
  ballot,
  candidateManager
}) {
  const now = Math.floor(Date.now() / 1000);

  return (
    <div>
      {elections.map((e) => {
        // determine status
        let status = "Upcoming";
        if (now >= e.startTime && now <= e.endTime) status = "Active";
        else if (now > e.endTime) status = "Closed";

        const isSel    = selected?.id === e.id;
        const isActive = status === "Active";

        return (
          <div
            key={e.id}
            onClick={() => onSelect(e)}
            style={{
              border:     "1px solid #ccc",
              padding:    "1rem",
              marginBottom: "0.5rem",
              cursor:     "pointer",
              background: isSel ? "#eef" : "#fff",
            }}
          >
            <h3 style={{ margin: 0 }}>{e.name}</h3>
            <p style={{ margin: "0.25rem 0" }}>{e.description}</p>
            <small>
              {new Date(e.startTime * 1000).toLocaleString()} –{" "}
              {new Date(e.endTime * 1000).toLocaleString()}
            </small>
            <span
              style={{
                display:       "inline-block",
                padding:       "0.2rem 0.5rem",
                marginLeft:    "1rem",
                borderRadius:  4,
                background:
                  status === "Active"   ? "#cfc" :
                  status === "Closed"   ? "#fcc" :
                                          "#ffc",
              }}
            >
              {status}
            </span>

            {/* ─── Inline VotePanel ───────────────────────────── */}
            {isSel && isActive && whitelist.includes(account) && ballot && (
              <div style={{ marginTop: "1rem" }}>
                <VotePanel
                  electionId={e.id}
                  ballot={ballot}
                  candidateManager={candidateManager}
                />
              </div>
            )}

            {/* ─── Inline ResultsPanel ────────────────────────── */}
            {isSel && account === owner && ballot && candidateManager && (
              <div style={{ marginTop: "1rem" }}>
                <ResultsPanel
                  electionId={e.id}
                  ballot={ballot}
                  candidateManager={candidateManager}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
