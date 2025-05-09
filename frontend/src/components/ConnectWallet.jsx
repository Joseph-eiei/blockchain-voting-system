import React, { useContext, useEffect, useState } from "react";
import { EthersContext } from "../contexts/EthersContext";

export default function ConnectWallet() {
  const { signer, connectWallet } = useContext(EthersContext);
  const [address, setAddress] = useState("");

  // once signer changes, read its address
  useEffect(() => {
    if (!signer) return;
    signer.getAddress().then(addr => setAddress(addr));
  }, [signer]);

  return (
    <button onClick={connectWallet} style={{ padding: "0.5rem 1rem", fontSize: "1rem" }}>
      {address ? `Connected: ${address.slice(0,6)}…${address.slice(-4)}` : "Connect MetaMask"}
    </button>
  );
}