
import { GoogleGenAI, Modality } from "@google/genai";
import { SageResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

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
    The user is playing a number guessing game (1-100). Secret: ${target}, Guess: ${guess}, Attempt: ${attemptCount}.
    Act as "The Nebula Sage" (성운의 현자). 
    Provide mystical and brief feedback in KOREAN. 
    Use formal/archaic tone (~소, ~구려, ~도다). 
    Max 2 sentences.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return { text: response.text || "우주의 기운이 심상치 않구려..." };
  } catch (error) {
    return { 
      text: isCorrect ? "승리는 그대의 것이도다." : 
            isHigh ? "에너지가 너무 높이 솟구쳤소." : "시야가 너무 낮구려." 
    };
  }
};

export const speakSageMessage = async (text: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `[Calm, deep mystical voice] ${text}` }] }],
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
    audio.playbackRate = 1.4; // 속도를 살짝 낮추어 왜곡 방지
    (audio as any).preservesPitch = true; 
    
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioCtx.createMediaElementSource(audio);
    
    // 1. 고주파 필터 (화이트 노이즈 억제)
    const lowpass = audioCtx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(5500, audioCtx.currentTime); 

    // 2. 저주파 보강 (묵직한 느낌 추가)
    const lowshelf = audioCtx.createBiquadFilter();
    lowshelf.type = 'lowshelf';
    lowshelf.frequency.setValueAtTime(250, audioCtx.currentTime);
    lowshelf.gain.setValueAtTime(4, audioCtx.currentTime);

    // 3. 다이내믹 컴프레서 (볼륨 튀는 현상 방지)
    const compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-30, audioCtx.currentTime); 
    compressor.knee.setValueAtTime(40, audioCtx.currentTime);
    compressor.ratio.setValueAtTime(12, audioCtx.currentTime);
    compressor.attack.setValueAtTime(0.005, audioCtx.currentTime);
    compressor.release.setValueAtTime(0.2, audioCtx.currentTime);

    // 4. 게인 조절 (클리핑 방지를 위해 안전한 0.6으로 설정)
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.6; 
    
    source.connect(lowpass);
    lowpass.connect(lowshelf);
    lowshelf.connect(compressor);
    compressor.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    audio.play();
    audio.onended = () => {
      URL.revokeObjectURL(url);
      setTimeout(() => audioCtx.close(), 500);
    };
  } catch (error) {
    console.error("TTS Error:", error);
  }
};
