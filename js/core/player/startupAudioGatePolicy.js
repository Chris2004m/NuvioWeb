export function canReleasePlayingNativeStartupAudioGate({
  allowNativePlayback = false,
  hasPresentedPlaybackFrame = false,
  pendingAudioSelection = false,
  readyState = 0
} = {}) {
  return Boolean(
    allowNativePlayback &&
    hasPresentedPlaybackFrame &&
    !pendingAudioSelection &&
    Number.isFinite(Number(readyState)) &&
    Number(readyState) >= 3
  );
}

export function shouldAllowNativePlaybackDuringStartupAudioGate({
  isHlsPlayback = false,
  isPrioritizedWebOsRemoteMkvPlayback = false
} = {}) {
  return Boolean(isHlsPlayback || isPrioritizedWebOsRemoteMkvPlayback);
}

export function selectStartupAudioFallbackOption(options = []) {
  const supportedOptions = (Array.isArray(options) ? options : []).filter(
    (entry) => entry?.supported !== false
  );
  return supportedOptions.find((entry) => entry?.selected) || supportedOptions[0] || null;
}
