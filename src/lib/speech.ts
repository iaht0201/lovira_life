/**
 * Speech & Media Helper Utilities
 */
export function stopMediaStream(stream: MediaStream | null): void {
  if (!stream) return;
  try {
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch (err) {
        console.warn('Track stop error:', err);
      }
    });
  } catch (err) {
    console.warn('MediaStream stop error:', err);
  }
}
