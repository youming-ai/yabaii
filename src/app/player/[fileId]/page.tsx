/** * 播放器页面 * Simplified版本 - Transcriptionoperations在File主页Process*/

"use client";

import { useParams } from "next/navigation";
import PlayerErrorBoundary from "@/components/features/player/PlayerErrorBoundary";
import PlayerPageComponent from "@/components/features/player/PlayerPage";

export default function PlayerPage() {
  const params = useParams();
  const fileId = params.fileId as string;

  return (
    <PlayerErrorBoundary>
      <PlayerPageComponent fileId={fileId} />
    </PlayerErrorBoundary>
  );
}
