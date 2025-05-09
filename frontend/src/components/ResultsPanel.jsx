// src/components/ResultsPanel.jsx
import React, { useState, useEffect, useContext, useRef } from "react";
import { EthersContext } from "../contexts/EthersContext";
import Chart from "chart.js/auto";

export default function ResultsPanel({ electionId, ballot, candidateManager }) {
  const { contracts } = useContext(EthersContext);
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  const [error,    setError]    = useState("");
  const [winner,   setWinner]   = useState(null);  // { names: string[], count: number }
  const [closed,   setClosed]   = useState(false);

  // fetch the raw results
  const fetchResults = async () => {
    // 1) pull candidate IDs
    const rawIds = await contracts.em.getElectionCandidates(electionId);
    // 2) look up each candidate name + vote count
    const rows = await Promise.all(
      rawIds.map(async (bn) => {
        const id    = Number(bn);
        const c     = await candidateManager.getCandidate(id);
        const count = Number(await ballot.getVotes(electionId, id));
        return { name: c.name, count };
      })
    );
    return rows;
  };

  // one‐time chart creation
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    chartRef.current = new Chart(ctx, {
      type: "bar",
      data: { labels: [], datasets: [{ label: "Votes", data: [] }] },
      options: {
        responsive: true,
        plugins: {
          title:      { display: true, text: "Live Election Results" },
          legend:     { display: false },
          tooltip:    { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}` } },
        },
        scales: {
          x: { title: { display: true, text: "Candidate" } },
          y: {
            title:      { display: true, text: "Vote Count" },
            beginAtZero: true,
            ticks:      { precision: 0 },
          },
        },
      },
    });
    return () => chartRef.current.destroy();
  }, []);

  // poll every 5s, update chart + compute winner once election is over
  useEffect(() => {
    let interval;
    const update = async () => {
      try {
        const results = await fetchResults();
        // update the chart
        const chart = chartRef.current;
        chart.data.labels            = results.map((r) => r.name);
        chart.data.datasets[0].data  = results.map((r) => r.count);
        chart.update();

        // check if election is closed
        const e = await contracts.em.getElection(electionId);
        const now = Math.floor(Date.now() / 1000);
        if (now > Number(e.endTime)) {
          setClosed(true);
          // compute the winner(s) just once
          const max = Math.max(...results.map((r) => r.count));
          const names = results
            .filter((r) => r.count === max)
            .map((r) => r.name);
          setWinner({ names, count: max });
          // no need to recompute every 5s, clear interval
          clearInterval(interval);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load results");
      }
    };

    update();                    // initial
    interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, [electionId, ballot, candidateManager, contracts.em]);

  if (error) {
    return <p style={{ color: "red" }}>Error: {error}</p>;
  }

  return (
    <div style={{ marginTop: 20, padding: 20, border: "1px solid #ccc" }}>
      {closed && winner && (
        <div style={{ marginBottom: 16 }}>
          {winner.names.length === 1 ? (
            <h3>
              🏆 Winner: {winner.names[0]} ({winner.count} votes)
            </h3>
          ) : (
            <h3>
              🤝 Draw between {winner.names.join(", ")} ({winner.count} votes each)
            </h3>
          )}
        </div>
      )}
      <canvas ref={canvasRef} />
    </div>
  );
}
