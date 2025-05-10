// src/contexts/EthersContext.jsx
import React, { createContext, useState, useEffect } from "react";
import { ethers } from "ethers";
import {
  EM_ADDRESS, EM_ABI,
  CM_ADDRESS, CM_ABI,
  BQ_ADDRESS, BQ_ABI,
  RS_ADDRESS, RS_ABI,
  VR_ADDRESS, VR_ABI
} from "../contracts/config";

export const EthersContext = createContext({
  signer:            null,
  contracts:         null,
  connectWallet:     async () => {},
  disconnectWallet:  () => {}
});

export function EthersProvider({ children }) {
  const [signer,    setSigner]    = useState(null);
  const [contracts, setContracts] = useState(null);

  // wire up (or clear) contracts whenever signer changes
  useEffect(() => {
    if (!signer) {
      setContracts(null);
      return;
    }
    setContracts({
      em:      new ethers.Contract(EM_ADDRESS, EM_ABI, signer),
      cm:      new ethers.Contract(CM_ADDRESS, CM_ABI, signer),
      ballot:  new ethers.Contract(BQ_ADDRESS, BQ_ABI, signer),
      vr:      new ethers.Contract(VR_ADDRESS, VR_ABI, signer),
      results: new ethers.Contract(RS_ADDRESS, RS_ABI, signer),
    });
  }, [signer]);

  // request connection
  async function connectWallet() {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const s = await provider.getSigner();
    setSigner(s);
  }

  // Disconnect wallet
  function disconnectWallet() {
    setSigner(null);
  }

  return (
    <EthersContext.Provider
      value={{ signer, contracts, connectWallet, disconnectWallet }}
    >
      {children}
    </EthersContext.Provider>
  );
}
