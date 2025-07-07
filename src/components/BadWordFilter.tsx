"use client";

import { useEffect, useState } from "react";
import { detectBadWordsCombined, FilterResult } from "../utils/badWordDetector";

export default function BadWordFilter() {
  const [inputText, setInputText] = useState("");
  const [combinedResult, setCombinedResult] = useState<FilterResult | null>(
    null
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStats, setProcessingStats] = useState<{
    processingTime: number;
    textLength: number;
  } | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Handle client-side initialization
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Memoized processText function
  const processText = async () => {
    if (!inputText.trim()) return;

    setIsProcessing(true);
    const startTime = isClient ? performance.now() : 0;

    try {
      // Performance optimization: limit text length for processing
      const maxTextLength = 5000;
      const textToProcess =
        inputText.length > maxTextLength
          ? inputText.substring(0, maxTextLength) + "..."
          : inputText;

      // Process with combined function only
      const combinedResult = detectBadWordsCombined(textToProcess);

      setCombinedResult(combinedResult);

      // Calculate processing statistics
      const endTime = isClient ? performance.now() : 0;
      const processingTime = endTime - startTime;

      setProcessingStats({
        processingTime,
        textLength: inputText.length,
      });
    } catch (error) {
      console.error("Error processing text:", error);

      // Set error states
      const errorResult: FilterResult = {
        original: inputText,
        filtered: inputText,
        detectedWords: [],
        isClean: true,
      };

      setCombinedResult(errorResult);
      setProcessingStats(null);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (!isClient) return;

    if (inputText.trim()) {
      const timeoutId = setTimeout(processText, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setCombinedResult(null);
    }
  }, [inputText, isClient]);

  const sampleTexts = [
    // Clean words
    "hello",
    "world",
    "test",
    "clean",
    "text",
    "message",
    "great",
    "fantastic",
    "amazing",
    "wonderful",

    // Basic bad words
    "fuck",
    "shit",
    "ass",
    "bitch",
    "cock",
    "cunt",
    "dick",
    "pussy",
    "whore",
    "slut",

    // Case variations
    "FUCK",
    "Shit",
    "ASS",
    "Bitch",
    "COCK",
    "Cunt",
    "DICK",
    "Pussy",
    "WHORE",
    "Slut",

    // Mixed case
    "FuCk",
    "ShIt",
    "AsS",
    "BiTcH",
    "CoCk",
    "CuNt",
    "DiCk",
    "PuSsY",
    "WhOrE",
    "SlUt",

    // Underscore variations
    "f_u_c_k",
    "s_h_i_t",
    "a_s_s",
    "b_i_t_c_h",
    "c_o_c_k",
    "c_u_n_t",
    "d_i_c_k",
    "p_u_s_s_y",
    "w_h_o_r_e",
    "s_l_u_t",

    // Number substitutions
    "f4ck",
    "sh1t",
    "4ss",
    "b1tch",
    "c0ck",
    "cunt",
    "d1ck",
    "pussy",
    "wh0re",
    "slut",

    // Underscore + numbers
    "f_4_c_k",
    "sh_1_t",
    "4_s_s",
    "b_1_t_c_h",
    "c_0_c_k",
    "c_u_n_t",
    "d_1_c_k",
    "p_u_s_s_y",
    "wh_0_r_e",
    "s_l_u_t",

    // Mixed case with numbers
    "F_4_C_K",
    "Sh_1_T",
    "4_S_S",
    "B_1_T_C_H",
    "C_0_C_K",
    "C_U_N_T",
    "D_1_C_K",
    "P_U_S_S_Y",
    "Wh_0_R_E",
    "S_L_U_T",

    // Full width characters
    "ｆｕｃｋ",
    "ｓｈｉｔ",
    "ａｓｓ",
    "ｂｉｔｃｈ",
    "ｃｏｃｋ",
    "ｃｕｎｔ",
    "ｄｉｃｋ",
    "ｐｕｓｓｙ",
    "ｗｈｏｒｅ",
    "ｓｌｕｔ",

    // Cyrillic lookalikes
    "fаck",
    "shіt",
    "аss",
    "bіtch",
    "cоck",
    "cunt",
    "dіck",
    "pussy",
    "whоre",
    "slut",
  ];

  // Show loading state during SSR
  if (!isClient) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Text Input</h2>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Ultimate Bad Words Filter
        </h2>
        <p className="text-gray-600 mb-4">
          Comprehensive detection using bad-words library with enhanced
          variation detection + obscenity library as extra layer
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enter text to filter:
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type or paste text here to test bad word filtering..."
            className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900"
          />
        </div>

        {/* Results Section */}
        <div className="grid md:grid-cols-1 gap-6">
          {/* Combined Results */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">
                Combined (Both Libraries)
              </h3>
              {combinedResult && (
                <span
                  className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                    combinedResult.isClean
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {combinedResult.isClean ? "Clean" : "Contains Bad Words"}
                </span>
              )}
            </div>

            {combinedResult ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Original Text:
                  </label>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
                    {combinedResult.original}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filtered Text:
                  </label>
                  <div className="p-3 bg-green-50 rounded-lg text-sm text-gray-900">
                    {combinedResult.filtered}
                  </div>
                </div>

                {combinedResult.detectedWords.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Detected Words:
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {combinedResult.detectedWords.map((word, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-md"
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">
                Enter text above to see results
              </div>
            )}
          </div>
        </div>

        {isProcessing && (
          <div className="flex items-center text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Processing...
          </div>
        )}

        {processingStats && isClient && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Processing Statistics
            </h4>
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
              <div>
                <span className="font-medium">Text Length:</span>{" "}
                {processingStats.textLength} chars
              </div>
              <div>
                <span className="font-medium">Processing Time:</span>{" "}
                {processingStats.processingTime.toFixed(2)}ms
              </div>
            </div>
          </div>
        )}

        {/* Sample Texts */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quick test with sample words:
          </label>
          <div className="flex flex-wrap gap-2">
            {sampleTexts.map((text, index) => (
              <button
                key={index}
                onClick={() => setInputText(text)}
                className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors border border-gray-300"
              >
                {text.length > 15 ? text.substring(0, 12) + "..." : text}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
