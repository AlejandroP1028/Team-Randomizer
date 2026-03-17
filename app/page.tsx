"use client";

import dynamic from "next/dynamic";

const TeamRandomizerApp = dynamic(
  () => import("@/components/TeamRandomizerApp").then(m => m.TeamRandomizerApp),
  { ssr: false }
);

export default function Home() {
  return <TeamRandomizerApp />;
}
