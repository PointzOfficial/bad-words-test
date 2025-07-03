"use client";

import { Filter } from "bad-words";
import {
  RegExpMatcher,
  TextCensor,
  englishDataset,
  englishRecommendedTransformers,
} from "obscenity";
import { useEffect, useState } from "react";

interface FilterResult {
  original: string;
  filtered: string;
  detectedWords: string[];
  isClean: boolean;
}

export default function BadWordFilter() {
  const [inputText, setInputText] = useState("");
  const [obscenityResult, setObscenityResult] = useState<FilterResult | null>(
    null
  );
  const [badWordsResult, setBadWordsResult] = useState<FilterResult | null>(
    null
  );
  const [combinedResult, setCombinedResult] = useState<FilterResult | null>(
    null
  );
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize filters
  const [badWordsFilter] = useState(() => new Filter());
  const [obscenityMatcher] = useState(
    () =>
      new RegExpMatcher({
        ...englishDataset.build(),
        ...englishRecommendedTransformers,
      })
  );
  const [obscenityCensor] = useState(() => new TextCensor());

  const processText = async () => {
    if (!inputText.trim()) return;

    setIsProcessing(true);

    try {
      // Process with obscenity library
      const obscenityDetected = obscenityMatcher.hasMatch(inputText);
      const obscenityMatches = obscenityDetected
        ? obscenityMatcher.getAllMatches(inputText, true)
        : [];
      const obscenityFiltered = obscenityCensor.applyTo(
        inputText,
        obscenityMatches
      );

      const obscenityWords = obscenityMatches.map((match) => {
        const payload = englishDataset.getPayloadWithPhraseMetadata(match);
        return payload.phraseMetadata?.originalWord || "unknown";
      });
      console.log("obscenityFiltered", obscenityFiltered);
      console.log("obscenityMatches", obscenityMatches);
      console.log("obscenityDetected", obscenityDetected);
      console.log("obscenityWords", obscenityWords);
      setObscenityResult({
        original: inputText,
        filtered: obscenityFiltered,
        detectedWords: obscenityWords,
        isClean: !obscenityDetected,
      });

      // Process with bad-words
      const badWordsDetected = badWordsFilter.isProfane(inputText);
      const badWordsFiltered = badWordsFilter.clean(inputText);
      const badWordsWords = badWordsDetected ? badWordsFilter.list : [];
      const badWordsWordsFiltered = badWordsWords.filter((word: string) =>
        inputText.toLowerCase().includes(word.toLowerCase())
    );
    console.log("badWordsFiltered", badWordsFiltered);
    console.log("badWordsDetected", badWordsDetected);
    console.log("badWordsWordsFiltered", badWordsWordsFiltered);
    const badWordsWordsFilteredSet = [...new Set(badWordsWordsFiltered)];
      setBadWordsResult({
        original: inputText,
        filtered: badWordsFiltered,
        // remove duplicates
        detectedWords: badWordsWordsFilteredSet,
        isClean: !badWordsDetected,
      });

      // Process with combined approach
      let combinedFiltered = inputText;
      const combinedDetectedWords: string[] = [];

      if (badWordsDetected) {
        combinedFiltered = badWordsFilter.clean(combinedFiltered);
        combinedDetectedWords.push(...badWordsWordsFilteredSet);
      }

      if (obscenityDetected) {
        // Apply obscenity filtering to the already filtered text
        const obscenityMatchesCombined = obscenityMatcher.getAllMatches(
          combinedFiltered,
          true
        );
        combinedFiltered = obscenityCensor.applyTo(
          combinedFiltered,
          obscenityMatchesCombined
        );

        const obscenityWordsCombined = obscenityMatchesCombined.map((match) => {
          const payload = englishDataset.getPayloadWithPhraseMetadata(match);
          return payload.phraseMetadata?.originalWord || "unknown";
        });
        combinedDetectedWords.push(...obscenityWordsCombined);
      }

      setCombinedResult({
        original: inputText,
        filtered: combinedFiltered,
        detectedWords: combinedDetectedWords,
        isClean: !badWordsDetected && !obscenityDetected,
      });
    } catch (error) {
      console.error("Error processing text:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (inputText.trim()) {
      const timeoutId = setTimeout(processText, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setObscenityResult(null);
      setBadWordsResult(null);
      setCombinedResult(null);
    }
  }, [inputText]);

  const sampleTexts = [
    "This is a clean text with no bad words.",
    "Hello world, this is a test message.",
    "I'm feeling great today!",
    "This text contains some inappropriate language that should be filtered.",
    "What the hell is going on here?",
    "That's absolutely fantastic!",
    "I can't believe this is happening.",
    "This is a test of various expressions and words.",
  ];

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Text Input</h2>

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

        {/* Sample Texts */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quick test with sample texts:
          </label>
          <div className="flex flex-wrap gap-2">
            {sampleTexts.map((text, index) => (
              <button
                key={index}
                onClick={() => setInputText(text)}
                className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors border border-gray-300"
              >
                Sample {index + 1}
              </button>
            ))}
          </div>
        </div>

        {isProcessing && (
          <div className="flex items-center text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Processing...
          </div>
        )}
      </div>

      {/* Results Section */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Obscenity Results */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">
              Obscenity Library
            </h3>
            {obscenityResult && (
              <span
                className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                  obscenityResult.isClean
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {obscenityResult.isClean ? "Clean" : "Contains Bad Words"}
              </span>
            )}
          </div>

          {obscenityResult ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Original Text:
                </label>
                <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
                  {obscenityResult.original}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filtered Text:
                </label>
                <div className="p-3 bg-green-50 rounded-lg text-sm text-gray-900">
                  {obscenityResult.filtered}
                </div>
              </div>

              {obscenityResult.detectedWords.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Detected Words:
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {obscenityResult.detectedWords.map((word, index) => (
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

        {/* Bad-Words Results */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">
              Bad-Words Library
            </h3>
            {badWordsResult && (
              <span
                className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                  badWordsResult.isClean
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {badWordsResult.isClean ? "Clean" : "Contains Bad Words"}
              </span>
            )}
          </div>

          {badWordsResult ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Original Text:
                </label>
                <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
                  {badWordsResult.original}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filtered Text:
                </label>
                <div className="p-3 bg-green-50 rounded-lg text-sm text-gray-900">
                  {badWordsResult.filtered}
                </div>
              </div>

              {badWordsResult.detectedWords.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Detected Words:
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {badWordsResult.detectedWords.map((word, index) => (
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
    </div>
  );
}
