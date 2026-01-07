
import { GoogleGenAI, Modality } from "@google/genai";
import { SageResponse } from "../types";

// 유틸리티: Base64 디코딩
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// 유틸리티: WAV 인코딩
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

/**
 * 성운의 현자로부터 텍스트 피드백을 생성합니다.
 * Vercel 환경 변수인 process.env.API_KEY를 자동으로 사용합니다.
 */
export const getSageFeedback = async (
  guess: number, 
  target: number, 
  attemptCount: number,
  history: number[]
): Promise<{ text: string }> => {
  // 호출 시점에 새 인스턴스 생성 (Vercel 환경 변수 참조 보장)
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  
  const isCorrect = guess === target;
  const isHigh = guess > target;
  const isStart = attemptCount === 0;
  
  const prompt = isStart 
    ? `Act as "The Nebula Sage" (성운의 현자). User just entered the realm. Greet them mystically in KOREAN. Formal/archaic tone (~소, ~구려, ~도다). Max 2 sentences.`
    : `The user is playing a number guessing game (1-100). Secret: ${target}, Guess: ${guess}, Attempt: ${attemptCount}.
    Act as "The Nebula Sage" (성운의 현자). 
    Provide mystical and brief feedback in KOREAN. 
    Use formal/archaic tone (~소, ~구려, ~도다). 
    Max 2 sentences. 
    Keep it wise and mysterious.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return { text: response.text || "우주의 기운이 심상치 않구려..." };
  } catch (error) {
    console.error("Gemini API Error:", error);
    if (isStart) return { text: "성운의 입구에 오신 것을 환영하오. 숫자 탐구를 시작해보세." };
    return { 
      text: isCorrect ? "승리는 그대의 것이도다." : 
            isHigh ? "에너지가 너무 높이 솟구쳤소." : "시야가 너무 낮구려." 
    };
  }
};

/**
 * 성운의 현자 목소리로 텍스트를 음성 변환합니다.
 * 나레이션 속도를 더 빠르게 조정하였습니다.
 */
export const speakSageMessage = async (text: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `[Mystical ancient voice, deep and resonant] ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Charon' },
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
    // 나레이션 속도를 1.6으로 상향 조정 (사용자 요청: 더 빠르게)
    audio.playbackRate = 1.6; 
    (audio as any).preservesPitch = true; 
    
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioCtx.createMediaElementSource(audio);
    
    const lowpass = audioCtx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(4500, audioCtx.currentTime); 

    const compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-40, audioCtx.currentTime); 
    compressor.ratio.setValueAtTime(12, audioCtx.currentTime);

    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.55; 
    
    source.connect(lowpass);
    lowpass.connect(compressor);
    compressor.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    audio.play();
    audio.onended = () => {
      URL.revokeObjectURL(url);
      setTimeout(() => audioCtx.close(), 1000);
    };
  } catch (error) {
    console.error("TTS Error:", error);
  }
};
