/**
 * Text-to-Speech Service
 * Converts the AI's text response into spoken audio using the LLM provider's
 * OpenAI-compatible speech endpoint (Groq /v1/audio/speech).
 *
 * Best-effort: callers should treat a null return as "voice output unavailable"
 * and still show the text response.
 */

const TTS_ENABLED = process.env.TTS_ENABLED !== "false";
const TTS_MODEL = process.env.TTS_MODEL || "canopylabs/orpheus-v1-english";
const TTS_VOICE = process.env.TTS_VOICE || "hannah";
const TTS_RESPONSE_FORMAT = "wav";
const TTS_MAX_CHUNK = 180;

const TTS_ENDPOINT = `${(process.env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "")}/audio/speech`;

/**
 * Synthesize speech for a text response.
 * Long text is split into chunks (model input limit) and the WAV files merged.
 * Returns { audioBase64, contentType } or null on failure.
 */
export async function synthesizeSpeech(text) {
  if (!TTS_ENABLED) return null;
  if (!text || typeof text !== "string") return null;

  const cleanText = cleanForSpeech(text);
  if (!cleanText) return null;

  const wavBuffers = [];
  for (const chunk of splitIntoChunks(cleanText)) {
    const buffer = await requestSpeech(chunk);
    if (buffer) wavBuffers.push(buffer);
  }

  if (wavBuffers.length === 0) return null;

  const merged = wavBuffers.length === 1 ? wavBuffers[0] : mergeWavBuffers(wavBuffers);

  return {
    audioBase64: merged.toString("base64"),
    contentType: "audio/wav",
  };
}

/**
 * Remove special markers / JSON / markdown syntax that should not be spoken.
 */
function cleanForSpeech(text) {
  let clean = text
    .replace(/PROFILE_COMPLETE|INTERVIEW_COMPLETE/gi, "")
    .replace(/\{[^}]*(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, " ")
    .replace(/[#*_`>~]/g, " ")
    .replace(/\[SYSTEM:.*?\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Strip any trailing JSON object that agents may append
  const jsonStart = clean.lastIndexOf("{");
  if (jsonStart > 0 && clean.indexOf("}") > jsonStart) {
    clean = clean.slice(0, jsonStart).trim();
  }

  return clean;
}

/**
 * Split text into chunks that respect the model's max input length.
 */
function splitIntoChunks(text, max = TTS_MAX_CHUNK) {
  if (text.length <= max) return [text];

  const chunks = [];
  const sentences = text.match(/[^.!?]+[.!?]*(\s|$)/g) || [text];

  let current = "";
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if ((current + " " + trimmed).trim().length <= max) {
      current = `${current} ${trimmed}`.trim();
    } else {
      if (current) chunks.push(current);
      if (trimmed.length <= max) {
        current = trimmed;
      } else {
        // Word-wrap oversized sentence
        let words = trimmed.split(/\s+/);
        let line = "";
        for (const word of words) {
          if ((line + " " + word).trim().length <= max) {
            line = `${line} ${word}`.trim();
          } else {
            if (line) chunks.push(line);
            line = word;
          }
        }
        current = line;
      }
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

async function requestSpeech(input) {
  try {
    const response = await fetch(TTS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: TTS_MODEL,
        voice: TTS_VOICE,
        input,
        response_format: TTS_RESPONSE_FORMAT,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`TTS API error (${response.status}): ${errorText}`);
      return null;
    }

    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    console.error("TTS request failed:", error.message);
    return null;
  }
}

function findChunk(buffer, id) {
  let offset = 12; // skip RIFF header + size + WAVE
  while (offset + 8 <= buffer.length) {
    if (buffer.toString("ascii", offset, offset + 4) === id) {
      const size = buffer.readUInt32LE(offset + 4);
      return buffer.subarray(offset + 8, offset + 8 + size);
    }
    const size = buffer.readUInt32LE(offset + 4);
    offset += 8 + size + (size % 2);
  }
  return null;
}

function mergeWavBuffers(buffers) {
  const first = buffers[0];
  const fmtData = findChunk(first, "fmt ");
  const dataChunks = [];

  let audioFormat = 1;
  let numChannels = 1;
  let sampleRate = 44100;
  let byteRate = 44100 * 2;
  let blockAlign = 2;
  let bitsPerSample = 16;

  if (fmtData && fmtData.length >= 16) {
    audioFormat = fmtData.readUInt16LE(0);
    numChannels = fmtData.readUInt16LE(2);
    sampleRate = fmtData.readUInt32LE(4);
    byteRate = fmtData.readUInt32LE(8);
    blockAlign = fmtData.readUInt16LE(12);
    bitsPerSample = fmtData.readUInt16LE(14);
  }

  for (const buffer of buffers) {
    const data = findChunk(buffer, "data");
    if (data && data.length > 0) dataChunks.push(data);
  }

  if (dataChunks.length === 0) return first;

  const totalDataLength = dataChunks.reduce((sum, d) => sum + d.length, 0);
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + totalDataLength, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(audioFormat, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(totalDataLength, 40);

  return Buffer.concat([header, ...dataChunks]);
}

export default synthesizeSpeech;