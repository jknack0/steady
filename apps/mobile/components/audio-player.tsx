import { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Audio, AVPlaybackStatus } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../lib/api";

interface AudioPlayerProps {
  audioKey: string;
  durationSecs?: number;
}

const PLAYBACK_SPEEDS = [1, 1.25, 1.5] as const;
const SKIP_SECONDS = 15;

function formatTime(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayer({ audioKey, durationSecs }: AudioPlayerProps) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(durationSecs ? durationSecs * 1000 : 0);
  const [speedIndex, setSpeedIndex] = useState(0);

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setIsPlaying(status.isPlaying);
    setPositionMs(status.positionMillis);
    if (status.durationMillis) {
      setDurationMs(status.durationMillis);
    }
    if (status.didJustFinish) {
      setIsPlaying(false);
      setPositionMs(0);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAudio() {
      try {
        // Configure audio mode for background playback
        await Audio.setAudioModeAsync({
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
        });

        // Get presigned download URL
        const res = await api.getPresignedDownloadUrl(audioKey);
        if (cancelled) return;

        if (!res.success || !res.data?.downloadUrl) {
          setError("Could not load audio");
          setIsLoading(false);
          return;
        }

        const { sound } = await Audio.Sound.createAsync(
          { uri: res.data.downloadUrl },
          { shouldPlay: false, progressUpdateIntervalMillis: 500 },
          onPlaybackStatusUpdate
        );

        if (cancelled) {
          await sound.unloadAsync();
          return;
        }

        soundRef.current = sound;
        setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load audio");
          setIsLoading(false);
        }
      }
    }

    loadAudio();

    return () => {
      cancelled = true;
      soundRef.current?.unloadAsync();
      soundRef.current = null;
    };
  }, [audioKey, onPlaybackStatusUpdate]);

  async function togglePlay() {
    const sound = soundRef.current;
    if (!sound) return;

    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      // If finished, replay from start
      if (durationMs > 0 && positionMs >= durationMs - 500) {
        await sound.setPositionAsync(0);
      }
      await sound.playAsync();
    }
  }

  async function skip(seconds: number) {
    const sound = soundRef.current;
    if (!sound) return;
    const newPos = Math.max(0, Math.min(positionMs + seconds * 1000, durationMs));
    await sound.setPositionAsync(newPos);
  }

  async function cycleSpeed() {
    const nextIndex = (speedIndex + 1) % PLAYBACK_SPEEDS.length;
    setSpeedIndex(nextIndex);
    const sound = soundRef.current;
    if (sound) {
      await sound.setRateAsync(PLAYBACK_SPEEDS[nextIndex], true);
    }
  }

  async function seekToPosition(touchX: number, barWidth: number) {
    const sound = soundRef.current;
    if (!sound || durationMs <= 0 || barWidth <= 0) return;
    const fraction = Math.max(0, Math.min(1, touchX / barWidth));
    await sound.setPositionAsync(Math.floor(fraction * durationMs));
  }

  const progress = durationMs > 0 ? positionMs / durationMs : 0;

  if (error) {
    return (
      <View style={{ backgroundColor: "#F7F5F2", borderRadius: 12, padding: 16, alignItems: "center" }}>
        <Ionicons name="alert-circle-outline" size={24} color="#D4A0A0" />
        <Text style={{ fontSize: 13, color: "#8A8A8A", marginTop: 4, fontFamily: "PlusJakartaSans_400Regular" }}>
          {error}
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={{ backgroundColor: "#F7F5F2", borderRadius: 12, padding: 20, alignItems: "center" }}>
        <ActivityIndicator size="small" color="#5B8A8A" />
        <Text style={{ fontSize: 13, color: "#8A8A8A", marginTop: 8, fontFamily: "PlusJakartaSans_400Regular" }}>
          Loading audio...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: "#F7F5F2", borderRadius: 12, padding: 16 }}>
      {/* Seek bar */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={(e) => {
          const barWidth = e.nativeEvent.target ? 0 : 0; // fallback
          seekToPosition(e.nativeEvent.locationX, e.nativeEvent.locationX / Math.max(progress, 0.01));
        }}
        onLayout={() => {}}
        style={{ height: 24, justifyContent: "center", marginBottom: 4 }}
      >
        <View
          style={{ height: 4, backgroundColor: "#D4D0CB", borderRadius: 2, overflow: "hidden" }}
          onStartShouldSetResponder={() => true}
          onResponderRelease={(e) => {
            // Use the layout width approximation from the touch event
            const layout = e.nativeEvent;
            // We measure from the left edge of the bar
            seekToPosition(layout.locationX, layout.locationX / Math.max(progress, 0.001));
          }}
        >
          <View
            style={{
              height: 4,
              backgroundColor: "#5B8A8A",
              borderRadius: 2,
              width: `${Math.min(progress * 100, 100)}%`,
            }}
          />
        </View>
      </TouchableOpacity>

      {/* Time labels */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
        <Text style={{ fontSize: 11, color: "#8A8A8A", fontFamily: "PlusJakartaSans_400Regular" }}>
          {formatTime(positionMs)}
        </Text>
        <Text style={{ fontSize: 11, color: "#8A8A8A", fontFamily: "PlusJakartaSans_400Regular" }}>
          {durationMs > 0 ? formatTime(durationMs) : "--:--"}
        </Text>
      </View>

      {/* Controls */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 }}>
        {/* Speed */}
        <TouchableOpacity
          onPress={cycleSpeed}
          style={{
            backgroundColor: "#E3EDED",
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
        >
          <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_600SemiBold", color: "#5B8A8A" }}>
            {PLAYBACK_SPEEDS[speedIndex]}x
          </Text>
        </TouchableOpacity>

        {/* Skip back 15s */}
        <TouchableOpacity onPress={() => skip(-SKIP_SECONDS)} style={{ padding: 8 }}>
          <Ionicons name="play-back-outline" size={22} color="#5B8A8A" />
        </TouchableOpacity>

        {/* Play / Pause — large button */}
        <TouchableOpacity
          onPress={togglePlay}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: "#5B8A8A",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={isPlaying ? "pause" : "play"} size={28} color="white" />
        </TouchableOpacity>

        {/* Skip forward 15s */}
        <TouchableOpacity onPress={() => skip(SKIP_SECONDS)} style={{ padding: 8 }}>
          <Ionicons name="play-forward-outline" size={22} color="#5B8A8A" />
        </TouchableOpacity>

        {/* Spacer to balance speed button */}
        <View style={{ width: 46 }} />
      </View>
    </View>
  );
}
