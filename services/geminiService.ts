
import { GoogleGenAI, Modality } from "@google/genai";
import { SageResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

// Utility to decode base64 to Uint8Array
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// PCM 데이터를 WAV 포맷으로 감싸는 함수 (HTMLAudioElement 재생용)
function encodeWAV(samples: Int16Array, sampleRate: number) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  for (let i = 0; i < samples.length; i++) {
    view.setInt16(44 + i * 2, samples[i], true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

export const getSageFeedback = async (
  guess: number, 
  target: number, 
  attemptCount: number,
  history: number[]
): Promise<{ text: string }> => {
  const isCorrect = guess === target;
  const isHigh = guess > target;
  
  const prompt = `
    The user is playing a number guessing game (1-100).
    The secret number is ${target}.
    The user just guessed ${guess}. 
    This is attempt number ${attemptCount}.
    Previous guesses: ${history.join(', ')}.
    Status: ${isCorrect ? 'Correct!' : isHigh ? 'Too high' : 'Too low'}.

    Act as the "Nebula Sage", a mysterious psychic entity living in a digital nebula. 
    Provide a short, mystical, and slightly playful commentary about their guess in KOREAN.
    Use a mystical and formal tone (e.g., ~소, ~구려, ~도다).
    Maximum 2 sentences.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return { text: response.text || "우주의 에너지가 소용돌이치는구려..." };
  } catch (error) {
    console.error("Gemini Error:", error);
    return { 
      text: isCorrect ? "승리는 그대의 것이도다, 여행자여." : 
            isHigh ? "그대의 에너지가 별들보다 너무 높이 솟구쳤구려." : 
            "그대의 시야가 아직 지평선 아래에 머물러 있도다." 
    };
  }
};

export const speakSageMessage = async (text: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return;

    const rawData = decode(base64Audio);
    const pcmData = new Int16Array(rawData.buffer);
    const wavBlob = encodeWAV(pcmData, 24000);
    const url = URL.createObjectURL(wavBlob);

    const audio = new Audio(url);
    // 피치를 유지하면서 속도만 1.8배로 올림
    audio.playbackRate = 1.8;
    (audio as any).preservesPitch = true; 
    
    // 볼륨 증폭을 위한 Web Audio API 연결
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioCtx.createMediaElementSource(audio);
    const gainNode = audioCtx.createGain();
    
    // 나레이션 볼륨을 대폭 증폭 (기존 대비 2.5배)
    gainNode.gain.value = 2.5; 
    
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    audio.play();
    audio.onended = () => {
      URL.revokeObjectURL(url);
      audioCtx.close();
    };
  } catch (error) {
    console.error("TTS Error:", error);
  }
};
