import { requestWebOsCompanionService } from "../../platform/webos/webosCompanionService.js";

const REQUEST_TIMEOUT_MS = 60000;

function withTimeout(promise, timeoutMs) {
  let timeoutId = 0;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error("webOS embedded subtitle request timed out")),
      timeoutMs
    );
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

function getRequestErrorMessage(error, fallback) {
  return String(error?.errorText || error?.message || error?.errorCode || fallback);
}

export const localMediaEmbeddedSubtitleRepository = {
  async getWindow({ url, trackNumber, startSeconds, endSeconds, includeAssBody = false }) {
    const targetUrl = String(url || "").trim();
    const targetTrack = Math.trunc(Number(trackNumber));
    if (!/^https?:\/\//i.test(targetUrl) || !Number.isFinite(targetTrack) || targetTrack <= 0) {
      throw new Error("Invalid embedded text subtitle request");
    }

    let result;
    try {
      result = await withTimeout(
        requestWebOsCompanionService({
          method: "embeddedSubtitleTextWindow",
          parameters: {
            url: targetUrl,
            trackNumber: targetTrack,
            startSeconds: Math.max(0, Number(startSeconds) || 0),
            endSeconds: Math.max(1, Number(endSeconds) || 0),
            includeAssBody: Boolean(includeAssBody)
          }
        }),
        REQUEST_TIMEOUT_MS
      );
    } catch (error) {
      throw new Error(getRequestErrorMessage(error, "Embedded text subtitle extraction failed"));
    }

    const payload = result?.payload || {};
    if (payload.returnValue === false) {
      throw new Error(
        payload.errorText || payload.errorCode || "Embedded text subtitle extraction failed"
      );
    }
    if (payload.bodyTruncated) {
      throw new Error("Embedded text subtitle response is too large");
    }
    const body = String(payload.body || "");
    if (!body.trim()) {
      throw new Error("Embedded text subtitle response is empty");
    }

    return {
      format: String(payload.format || "vtt").toLowerCase(),
      trackNumber: targetTrack,
      codecId: String(payload.codecId || ""),
      language: String(payload.language || ""),
      name: String(payload.name || ""),
      windowStartSeconds: Math.max(0, Number(payload.windowStartSeconds) || 0),
      windowEndSeconds: Math.max(0, Number(payload.windowEndSeconds) || 0),
      contextStartSeconds: Math.max(0, Number(payload.contextStartSeconds) || 0),
      cueCount: Math.max(0, Math.trunc(Number(payload.cueCount) || 0)),
      hasAssOverrideTags: Boolean(payload.hasAssOverrideTags),
      hasAdvancedAssOverrideTags: Boolean(payload.hasAdvancedAssOverrideTags),
      assBody: String(payload.assBody || ""),
      body
    };
  }
};
