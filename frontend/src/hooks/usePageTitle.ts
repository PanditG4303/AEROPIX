import { useEffect } from "react";

export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} — AEROPIX` : "AEROPIX — Your memories. Your cloud. Your space.";
  }, [title]);
}
