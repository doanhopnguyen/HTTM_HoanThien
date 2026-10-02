import { useState } from "react";
import { View, Text } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEvent } from "expo";
import { styles } from "./ui";
export function VideoStream({ url }: { url: string | null }) {
  return url ? (
    <Player url={url} />
  ) : (
    <View style={[styles.card, { minHeight: 180, justifyContent: "center" }]}>
      <Text style={styles.muted}>
        No playable stream configured. Use an HTTP(S) HLS or MP4 source; RTSP
        needs a streaming gateway.
      </Text>
    </View>
  );
}
function Player({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.muted = true;
    p.play();
  });
  const { status } = useEvent(player, "statusChange", {
    status: player.status,
  });
  return (
    <View style={{ marginBottom: 20 }}>
      {status === "error" && (
        <Text accessibilityRole="alert" style={styles.muted}>
          Video unavailable. Check the camera source.
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
