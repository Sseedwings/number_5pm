import { GoogleGenAI, Modality } from "@google/genai";

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

// 유틸리티: WAV 인코딩 (PCM to WAV)
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
 * 지수 백오프(Exponential Backoff)를 적용한 강력한 재시도 메커니즘
 */
const robustRetry = async <T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> => {
  let lastError: any;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      // 429(할당량 초과) 및 500(서버 내부 오류) 감지
      const errorMsg = error?.message || "";
      const isQuotaError = error?.status === 429 || errorMsg.includes("429") || errorMsg.includes("quota");
      const isInternalError = error?.status === 500 || errorMsg.includes("500") || errorMsg.includes("INTERNAL");

      if (i < maxRetries && (isQuotaError || isInternalError)) {
        // 시도 횟수에 따라 지연 시간 증가 (1.5초, 3초, 4.5초...)
        const delay = (isQuotaError ? 3000 : 1000) * (i + 1);
        console.warn(`Resonance failed (${error?.status || 'Error'}). Re-tuning in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      break;
    }
  }
  throw lastError;
};

/**
 * 성운의 현자로부터 텍스트 피드백 생성
 */
export const getSageFeedback = async (
  guess: number, 
  target: number, 
  attemptCount: number,
  history: number[]
): Promise<{ text: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  
  const isCorrect = guess === target;
  const isHigh = guess > target;
  const isStart = attemptCount === 0;
  
  const prompt = isStart 
    ? `Act as "The Nebula Sage" (성운의 현자). User just entered. Greet them mystically in KOREAN. Formal/archaic tone (~소, ~구려, ~도다). Max 1 sentence.`
    : `The user is playing a number guessing game (1-100). Secret: ${target}, Guess: ${guess}, Attempt: ${attemptCount}.
    Act as "The Nebula Sage" (성운의 현자). 
    Provide mystical and brief feedback in KOREAN. 
    Use formal/archaic tone (~소, ~구려, ~도다). 
    Max 1 sentence. 
    Keep it wise and mysterious.`;

  try {
    const response = await robustRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    }));
    return { text: response.text || "우주의 기운이 심상치 않구려..." };
  } catch (error) {
    console.error("Gemini API Error (Text):", error);
    // 에러 발생 시 사용자 경험을 위해 기본 응답 제공
    if (isStart) return { text: "성운의 입구에 오신 것을 환영하오. 탐색을 시작하시오." };
    return { 
      text: isCorrect ? "진실의 주파수를 찾아내었구려. 승리했소!" : 
            isHigh ? "입력된 주파수가 너무 높구려. 조금 더 낮추어 보시오." : 
            "주파수가 너무 낮소. 더 높게 공명해 보시오." 
    };
  }
};

/**
 * 성운의 현자 목소리로 텍스트를 음성 변환 (TTS)
 */
export const speakSageMessage = async (text: string) => {
  try {
    // API 키는 항상 process.env.API_KEY에서 가져옴
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

    const response = await robustRetry(() => ai.models.generateContent({
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
    }), 1); // TTS는 재시도 횟수를 줄여서 반응성 유지

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return;

    const rawData = decode(base64Audio);
    const pcmData = new Int16Array(rawData.buffer);
    const wavBlob = encodeWAV(pcmData, 24000);
    const url = URL.createObjectURL(wavBlob);

    const audio = new Audio(url);
    audio.playbackRate = 2.0; // 신비로운 속도감 유지
    (audio as any).preservesPitch = true; 
    
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioCtx.createMediaElementSource(audio);
    
    // 오디오 필터: 신비로운 느낌 추가
    const lowpass = audioCtx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(4500, audioCtx.currentTime); 

    const compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-40, audioCtx.currentTime); 
    compressor.ratio.setValueAtTime(12, audioCtx.currentTime);

    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.65; 
    
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
    // 429(할당량 초과) 발생 시 게임 플레이 방해 없이 콘솔에만 기록
    console.warn("Sage's voice is currently echoing in silence (TTS Quota Exceeded).", error);
  }
};