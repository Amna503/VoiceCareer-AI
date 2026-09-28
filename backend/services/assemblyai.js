import { AssemblyAI } from "assemblyai";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY,
});

/**
 * Transcribe audio buffer using AssemblyAI SDK.
 * Writes to a temp file for reliable format detection.
 */
export async function transcribeAudio(audioBuffer) {
  const tempPath = join(tmpdir(), `audio-${Date.now()}.webm`);

  try {
    // Write buffer to temp file for reliable format detection
    await writeFile(tempPath, audioBuffer);

    console.log(`Audio written to temp file: ${tempPath} (${audioBuffer.length} bytes)`);

    const transcript = await client.transcripts.transcribe({
      audio: tempPath,
    });

    if (transcript.status === "error") {
      throw new Error(transcript.error || "Transcription failed");
    }

    return transcript.text;
  } finally {
    // Clean up temp file
    await unlink(tempPath).catch(() => {});
  }
}

export default transcribeAudio;
