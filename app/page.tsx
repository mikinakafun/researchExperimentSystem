import Experiment from "./experiment";
import { getStorageKind } from "../lib/server/result-store";

export const dynamic = "force-dynamic";

export default function Page() {
  return <Experiment storageKind={getStorageKind()} />;
}
