import { useEffect } from "react";
import { useCityStore } from "@/store/useCityStore";

export function Notice() {
  const { notice, clearNotice } = useCityStore();
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(clearNotice, 4200);
    return () => clearTimeout(t);
  }, [notice, clearNotice]);
  if (!notice) return null;
  return (
    <div role="status" className="glass fixed bottom-5 left-1/2 z-40 max-w-[92vw] -translate-x-1/2 rounded-full px-5 py-2.5 text-sm font-medium animate-in fade-in slide-in-from-bottom-2">
      {notice}
    </div>
  );
}
