import { useState } from "react";
import { View, Text } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEvent } from "expo";
import { styles } from "./styles";
import { baseUrl } from "../api/client";
export function VideoStream({ url: source }: { url: string | null }) {
  const url = source?.startsWith("/api/media/")
    ? `${baseUrl}${source}`
    : source;
  return url ? (
    <Player url={url} />
  ) : (
    <View style={[styles.card, { minHeight: 180, justifyContent: "center" }]}>
      <Text style={styles.muted}>
        Camera stream unavailable. Ask an administrator to configure a live
        stream for this camera.
      </Text>
    </View>
  );
}
function Player({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.muted = true;
    p.loop = true;
    p.play();
  });
  const { status } = useEvent(player, "statusChange", {
    status: player.status,
  });
  return (
    <View style={{ marginBottom: 20 }}>
      {status === "error" && (
        <Text accessibilityRole="alert" style={styles.muted}>
          Video unavailable right now. Try again shortly.
        </Text>
      )}
      <VideoView
        player={player}
        style={{ width: "100%", height: 230, borderRadius: 12 }}
        nativeControls
        fullscreenOptions={{ enable: true }}
      />
    </View>
  );
}
