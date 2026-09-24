import { useEffect, useState } from "react";

export function getRoute() {
  const hash = window.location.hash;
  const path = hash.startsWith("#") ? hash.slice(1) : "";
  return path === "" ? "/" : path;
}

export function useHashRoute() {
  const [route, setRoute] = useState(getRoute);

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return route;
}

export function navigate(to) {
  if (getRoute() === to) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  window.location.hash = to;
}