import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { UnitData, UnitsData } from "../lib/types";

const COLLECTION = "units";

export function useUnitsData() {
  const [data, setData] = useState<UnitsData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, COLLECTION), (snap) => {
      const next: UnitsData = {};
      snap.forEach((d) => {
        next[d.id] = d.data() as UnitData;
      });
      setData(next);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function saveUnit(id: string, unitData: UnitData) {
    await setDoc(doc(db, COLLECTION, id), unitData);
  }

  return { data, loading, saveUnit };
}
