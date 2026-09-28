/**
 * Voice Agent microphone capture worklet.
 *
 * The AssemblyAI Voice Agent API expects mono PCM16 at 24 kHz, base64-encoded per
 * `input.audio` event. The browser's AudioContext almost always runs at the device
 * rate (44.1 or 48 kHz), and forcing `new AudioContext({ sampleRate: 24000 })` is
 * Chromium-only — Safari ignores it and Firefox loses echo cancellation at
 * non-default rates. So we let the context run natively and resample here, which
 * is the pipeline that works on Chrome, Edge, Firefox and Safari.
 *
 * Chunks are accumulated to ~50 ms (1200 samples at 24 kHz) before being posted,
 * which is the size the Voice Agent docs recommend.
 */

class VoicePcmCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();

    const processorOptions = (options && options.processorOptions) || {};
    this.targetSampleRate = processorOptions.targetSampleRate || 24000;
    this.inputSampleRate = processorOptions.inputSampleRate || sampleRate;
    this.chunkSamples = processorOptions.chunkSamples || 1200;

    this.ratio = this.inputSampleRate / this.targetSampleRate;
    this.readPosition = 0;
    this.pending = new Float32Array(this.chunkSamples);
    this.fill = 0;
    this.muted = true;

    this.port.onmessage = (event) => {
      const data = event.data;
      if (data && typeof data.muted === "boolean") {
        this.muted = data.muted;
        if (this.muted) {
          // Drop anything half-collected so unmuting never replays stale audio.
          this.fill = 0;
          this.readPosition = 0;
        }
      }
    };
  }

  process(inputs) {
    const input = inputs[0] && inputs[0][0];

    if (!input || input.length === 0) {
      return true;
    }

    if (this.muted) {
      this.readPosition = 0;
      this.fill = 0;
      return true;
    }

    // Linear interpolation resampling, carrying the fractional read position
    // across render-quantum boundaries so long sessions do not drift.
    let position = this.readPosition;

    while (position < input.length) {
      const index = Math.floor(position);
      const next = index + 1 < input.length ? index + 1 : index;
      const fraction = position - index;
      const current = input[index];
      const following = input[next];

      this.pending[this.fill++] = current + (following - current) * fraction;
      position += this.ratio;

      if (this.fill === this.chunkSamples) {
        this.flush();
      }
    }

    this.readPosition = position - input.length;
    return true;
  }

  flush() {
    const pcm16 = new Int16Array(this.chunkSamples);

    for (let i = 0; i < this.chunkSamples; i++) {
      const sample = Math.max(-1, Math.min(1, this.pending[i]));
      pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }

    this.fill = 0;
    this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
  }
}

registerProcessor("voice-pcm-capture", VoicePcmCaptureProcessor);
