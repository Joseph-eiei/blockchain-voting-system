import EM from "./ElectionManager.json";
import CM from "./CandidateManager.json";
import BQ from "./Ballot.json";
import RS from "./Results.json";
import VR from "./VoterRegistry.json";

export const VR_ADDRESS = import.meta.env.VITE_VR_ADDRESS;
export const EM_ADDRESS = import.meta.env.VITE_EM_ADDRESS;
export const CM_ADDRESS = import.meta.env.VITE_CM_ADDRESS;
export const BQ_ADDRESS = import.meta.env.VITE_BQ_ADDRESS;
export const RS_ADDRESS = import.meta.env.VITE_RS_ADDRESS;

export const EM_ABI = EM.abi;
export const CM_ABI = CM.abi;
export const BQ_ABI = BQ.abi;
export const RS_ABI = RS.abi;
export const VR_ABI = VR.abi;
