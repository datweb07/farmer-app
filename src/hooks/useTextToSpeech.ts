// /**
//  * Text-to-Speech Hook for Accessibility
//  * Provides voice reading functionality for elderly users
//  */

// import { useState, useEffect, useCallback } from "react";

// export interface TTSOptions {
//   lang?: string;
//   rate?: number;
//   pitch?: number;
//   volume?: number;
// }

// export function useTextToSpeech() {
//   const [isSpeaking, setIsSpeaking] = useState(false);
//   const [isSupported, setIsSupported] = useState(false);

//   useEffect(() => {
//     // Check if browser supports Speech Synthesis API
//     setIsSupported("speechSynthesis" in window);
//   }, []);

//   const speak = useCallback(
//     (text: string, options?: TTSOptions) => {
//       if (!isSupported) {
//         console.warn("Text-to-speech not supported in this browser");
//         return;
//       }

//       // Cancel any ongoing speech
//       window.speechSynthesis.cancel();

//       const utterance = new SpeechSynthesisUtterance(text);
//       utterance.lang = options?.lang || "vi-VN";
//       utterance.rate = options?.rate || 0.9; // Slower for elderly
//       utterance.pitch = options?.pitch || 1;
//       utterance.volume = options?.volume || 1;

//       utterance.onstart = () => {
//         setIsSpeaking(true);
//       };

//       utterance.onend = () => {
//         setIsSpeaking(false);
//       };

//       utterance.onerror = (event) => {
//         console.error("Speech synthesis error:", event);
//         setIsSpeaking(false);
//       };

//       window.speechSynthesis.speak(utterance);
//     },
//     [isSupported],
//   );

//   const stop = useCallback(() => {
//     if (isSupported) {
//       window.speechSynthesis.cancel();
//       setIsSpeaking(false);
//     }
//   }, [isSupported]);

//   return {
//     speak,
//     stop,
//     isSpeaking,
//     isSupported,
//   };
// }

/**
 * Text-to-Speech Hook for Accessibility
 * Provides voice reading functionality for elderly users
 * ✅ FIX: Always prioritize Vietnamese voice (vi-VN)
 */

import { useState, useEffect, useCallback } from "react";

export interface TTSOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if ("speechSynthesis" in window) {
      setIsSupported(true);

      const loadVoices = () => {
        const allVoices = window.speechSynthesis.getVoices();
        setVoices(allVoices);
      };

      // Load lần đầu
      loadVoices();

      // Chrome cần event này
      window.speechSynthesis.onvoiceschanged = loadVoices;
    } else {
      setIsSupported(false);
    }
  }, []);

  const speak = useCallback(
    (text: string, options?: TTSOptions) => {
      if (!isSupported) {
        console.warn("Text-to-speech not supported in this browser");
        return;
      }

      // Dừng giọng đang chạy
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      // ✅ FIX QUAN TRỌNG: ÉP TIẾNG VIỆT
      utterance.lang = "vi-VN";

      // Optional config (ưu tiên options nếu có)
      utterance.rate = options?.rate ?? 0.9;
      utterance.pitch = options?.pitch ?? 1;
      utterance.volume = options?.volume ?? 1;

      // ✅ FIX QUAN TRỌNG: Tìm voice tiếng Việt
      const vietnameseVoice = voices.find(
        (voice) =>
          voice.lang === "vi-VN" ||
          voice.lang.toLowerCase().startsWith("vi")
      );

      if (vietnameseVoice) {
        utterance.voice = vietnameseVoice;
      } else {
        console.warn("⚠️ Không tìm thấy voice tiếng Việt trên thiết bị");
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event);
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    },
    [isSupported, voices],
  );

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  return {
    speak,
    stop,
    isSpeaking,
    isSupported,
  };
}
