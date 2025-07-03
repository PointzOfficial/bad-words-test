"use client";

import { Filter } from "bad-words";
import {
  RegExpMatcher,
  TextCensor,
  englishDataset,
  englishRecommendedTransformers,
} from "obscenity";
import { useEffect, useState, useMemo } from "react";

interface FilterResult {
  original: string;
  filtered: string;
  detectedWords: string[];
  isClean: boolean;
}

// Memoized variation cache to avoid regenerating the same variations
const variationCache = new Map<string, string[]>();

// Optimized function to generate essential word variations
const generateWordVariations = (word: string): string[] => {
  if (!word || word.length === 0) return [];
  
  // Check cache first
  if (variationCache.has(word)) {
    return variationCache.get(word)!;
  }
  
  const variations: Set<string> = new Set();
  const maxVariations = 200; // Reduced from 1000 to 200 for better performance
  
  // Add original word
  variations.add(word);
  
  // Common separators (reduced set)
  const separators = ['-', ' ', '.'];
  
  // Basic leetspeak substitutions (most common only)
  const leetMap: { [key: string]: string[] } = {
    'a': ['4'],
    'e': ['3'],
    'i': ['1'],
    'o': ['0'],
    's': ['5'],
    't': ['7']
  };
  
  // Generate basic variations with separators
  separators.forEach(sep => {
    const separated = word.split('').join(sep);
    variations.add(separated);
    
    // Add leetspeak version of separated word
    let leetSeparated = separated;
    Object.entries(leetMap).forEach(([letter, substitutes]) => {
      if (leetSeparated.includes(letter) && variations.size < maxVariations) {
        leetSeparated = leetSeparated.replace(new RegExp(letter, 'g'), substitutes[0]);
      }
    });
    variations.add(leetSeparated);
  });
  
  // Generate basic leetspeak variations
  let leetWord = word;
  Object.entries(leetMap).forEach(([letter, substitutes]) => {
    if (leetWord.includes(letter) && variations.size < maxVariations) {
      leetWord = leetWord.replace(new RegExp(letter, 'g'), substitutes[0]);
    }
  });
  variations.add(leetWord);
  
  // Add separated version of leetspeak
  separators.forEach(sep => {
    if (variations.size < maxVariations) {
      variations.add(leetWord.split('').join(sep));
    }
  });
  
  const result = Array.from(variations);
  
  // Cache the result
  variationCache.set(word, result);
  
  return result;
};

// Custom function to detect variations of bad words with word boundary checking
const detectBadWordVariations = (text: string, badWordsList: string[]): string[] => {
  if (!text || !badWordsList || badWordsList.length === 0) return [];
  
  const detectedWords: string[] = [];
  const lowerText = text.toLowerCase();
  
  // Common false positive words to ignore
  const falsePositives = new Set([
    'this', 'that', 'with', 'what', 'when', 'where', 'why', 'how',
    'text', 'test', 'best', 'rest', 'nest', 'west', 'east',
    'no', 'not', 'now', 'new', 'nor', 'net', 'nut',
    'sex', 'six', 'sin', 'sit', 'sir', 'say', 'see', 'sea',
    'tit', 'tie', 'tip', 'tin', 'tie', 'toy', 'try', 'two',
    'hui', 'hue', 'hug', 'hum', 'hut', 'hit', 'hot', 'hat',
    'nob', 'nod', 'not', 'now', 'new', 'net', 'nut'
  ]);
  
  // Helper function to check if a word exists in text with proper boundaries
  const checkWordExists = (word: string, text: string): boolean => {
    // For words with separators (like f-4-c-k), check the exact pattern
    if (word.includes('-') || word.includes(' ') || word.includes('.')) {
      // Escape special regex characters
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Match the pattern with word boundaries
      const pattern = new RegExp(`(^|[\\s\\W])${escapedWord}([\\s\\W]|$)`, 'gi');
      return pattern.test(text);
    } else {
      // For regular words, use word boundary checking
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`(^|[\\s\\W])${escapedWord}([\\s\\W]|$)`, 'gi');
      return pattern.test(text);
    }
  };
  
  // Process bad words with early termination
  for (const badWord of badWordsList) {
    const lowerBadWord = badWord.toLowerCase();
    
    // Skip very short words that are likely false positives
    if (lowerBadWord.length < 3) continue;
    
    // Skip common false positive words
    if (falsePositives.has(lowerBadWord)) continue;
    
    // Check for exact word boundary match first (fastest check)
    if (checkWordExists(lowerBadWord, lowerText)) {
      detectedWords.push(badWord);
      continue;
    }
    
    // Generate variations only if needed
    const variations = generateWordVariations(lowerBadWord);
    
    // Check variations with early termination
    for (const variation of variations) {
      if (variation.length < 2) continue;
      
      if (checkWordExists(variation, lowerText)) {
        detectedWords.push(badWord);
        break; // Found a match, no need to check more variations
      }
      
      // Fallback: for hyphenated patterns, also check without word boundaries
      if (variation.includes('-') || variation.includes(' ') || variation.includes('.')) {
        if (lowerText.includes(variation.toLowerCase())) {
          detectedWords.push(badWord);
          break;
        }
      }
    }
  }
  
  return [...new Set(detectedWords)];
};

// Optimized filtering function
const filterTextWithVariations = (text: string, badWordsList: string[]): string => {
  if (!text || !badWordsList || badWordsList.length === 0) {
    return text;
  }
  
  let filteredText = text;
  
  // Helper function to check if a word exists in text with proper boundaries
  const checkWordExists = (word: string, text: string): boolean => {
    if (word.includes('-') || word.includes(' ') || word.includes('.')) {
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`(^|[\\s\\W])${escapedWord}([\\s\\W]|$)`, 'gi');
      return pattern.test(text);
    } else {
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`(^|[\\s\\W])${escapedWord}([\\s\\W]|$)`, 'gi');
      return pattern.test(text);
    }
  };
  
  // Process each bad word
  for (const badWord of badWordsList) {
    if (!badWord || typeof badWord !== 'string') continue;
    
    const lowerBadWord = badWord.toLowerCase();
    const replacement = '*'.repeat(badWord.length);
    
    // Generate variations for this word
    const variations = generateWordVariations(lowerBadWord);
    
    // Replace each variation with word boundaries
    for (const variation of variations) {
      if (!variation || variation.length < 2) continue;
      
      try {
        const escapedVariation = variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const boundaryPattern = new RegExp(`(^|[\\s\\W])${escapedVariation}([\\s\\W]|$)`, 'gi');
        
        filteredText = filteredText.replace(boundaryPattern, (match, before, after) => {
          return before + replacement + after;
        });
      } catch (regexError) {
        // Fallback to simple string replacement with word boundaries
        const lowerText = filteredText.toLowerCase();
        const lowerVariation = variation.toLowerCase();
        const index = lowerText.indexOf(lowerVariation);
        
        if (index !== -1) {
          const beforeChar = index > 0 ? lowerText[index - 1] : ' ';
          const afterChar = index + lowerVariation.length < lowerText.length ? 
            lowerText[index + lowerVariation.length] : ' ';
          
          if ((beforeChar === ' ' || /[^\w]/.test(beforeChar)) && 
              (afterChar === ' ' || /[^\w]/.test(afterChar))) {
            filteredText = filteredText.slice(0, index) + 
                          replacement + 
                          filteredText.slice(index + variation.length);
          }
        }
      }
    }
  }
  
  return filteredText;
};

// Validation function to ensure system reliability
const validateInput = (text: string): { isValid: boolean; error?: string } => {
  if (!text) {
    return { isValid: true }; // Empty text is valid
  }
  
  if (typeof text !== 'string') {
    return { isValid: false, error: 'Input must be a string' };
  }
  
  if (text.length > 100000) { // 100KB limit
    return { isValid: false, error: 'Text too long (max 100KB)' };
  }
  
  // Check for potentially dangerous content (basic XSS prevention)
  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(text)) {
      return { isValid: false, error: 'Potentially dangerous content detected' };
    }
  }
  
  return { isValid: true };
};

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
  const [processingStats, setProcessingStats] = useState<{
    totalVariations: number;
    processingTime: number;
    textLength: number;
  } | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Initialize filters with useMemo for better performance
  const badWordsFilter = useMemo(() => new Filter(), []);
  const obscenityMatcher = useMemo(
    () =>
      new RegExpMatcher({
        ...englishDataset.build(),
        ...englishRecommendedTransformers,
      }),
    []
  );
  const obscenityCensor = useMemo(() => new TextCensor(), []);

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
      // Validate input
      const validation = validateInput(inputText);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid input');
      }
      
      // Performance optimization: limit text length for processing
      const maxTextLength = 5000; // Reduced to 5KB for better performance
      const textToProcess = inputText.length > maxTextLength 
        ? inputText.substring(0, maxTextLength) + "..."
        : inputText;

      // Process with obscenity library
      const obscenityDetected = obscenityMatcher.hasMatch(textToProcess);
      const obscenityMatches = obscenityDetected
        ? obscenityMatcher.getAllMatches(textToProcess, true)
        : [];
      const obscenityFiltered = obscenityCensor.applyTo(
        textToProcess,
        obscenityMatches
      );

      const obscenityWords = obscenityMatches.map((match) => {
        const payload = englishDataset.getPayloadWithPhraseMetadata(match);
        return payload.phraseMetadata?.originalWord || "unknown";
      });

      setObscenityResult({
        original: inputText,
        filtered: obscenityFiltered,
        detectedWords: obscenityWords,
        isClean: !obscenityDetected,
      });

      // Process with bad-words (enhanced with variations detection)
      const badWordsDetected = badWordsFilter.isProfane(textToProcess);
      const badWordsFiltered = badWordsFilter.clean(textToProcess);
      const badWordsWords = badWordsFilter.list;
      
      // Use enhanced detection for variations
      const badWordsWordsFiltered = detectBadWordVariations(textToProcess, badWordsWords);
      const badWordsWordsFilteredSet = [...new Set(badWordsWordsFiltered)];
      
      // Use enhanced filtering for variations
      const enhancedBadWordsFiltered = filterTextWithVariations(textToProcess, badWordsWords);
      
      const hasBadWords = badWordsWordsFilteredSet.length > 0;
      
      setBadWordsResult({
        original: inputText,
        filtered: enhancedBadWordsFiltered,
        detectedWords: badWordsWordsFilteredSet,
        isClean: !hasBadWords,
      });

      // Process with combined approach
      let combinedFiltered = inputText;
      const combinedDetectedWords: string[] = [];

      if (hasBadWords) {
        combinedFiltered = filterTextWithVariations(combinedFiltered, badWordsWords);
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
        isClean: !hasBadWords && !obscenityDetected,
      });
      
      // Calculate processing statistics
      const endTime = isClient ? performance.now() : 0;
      const processingTime = endTime - startTime;
      const totalVariations = badWordsWords.length > 0 ? 
        badWordsWords.reduce((total, word) => total + generateWordVariations(word.toLowerCase()).length, 0) : 0;
      
      setProcessingStats({
        totalVariations,
        processingTime,
        textLength: inputText.length,
      });
    } catch (error) {
      console.error("Error processing text:", error);
      
      // Set error states
      setObscenityResult({
        original: inputText,
        filtered: inputText,
        detectedWords: [],
        isClean: true,
      });
      setBadWordsResult({
        original: inputText,
        filtered: inputText,
        detectedWords: [],
        isClean: true,
      });
      setCombinedResult({
        original: inputText,
        filtered: inputText,
        detectedWords: [],
        isClean: true,
      });
      setProcessingStats(null);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (!isClient) return; // Don't process on server-side
    
    if (inputText.trim()) {
      const timeoutId = setTimeout(processText, 300); // Reduced from 500ms to 300ms
      return () => clearTimeout(timeoutId);
    } else {
      setObscenityResult(null);
      setBadWordsResult(null);
      setCombinedResult(null);
    }
  }, [inputText, isClient]);

  const sampleTexts = [
    "This is a clean text with no bad words.",
    "Hello world, this is a test message.",
    "I'm feeling great today!",
    "This text contains some inappropriate language that should be filtered.",
    "What the hell is going on here?",
    "That's absolutely fantastic!",
    "I can't believe this is happening.",
    "This is a test of various expressions and words.",
    "This text has f-u-c-k in it to test hyphenated detection.",
    "Testing spaced version: f u c k",
    "Testing mixed case: F-u-C-k",
    "Testing leetspeak: f-4-c-k",
    "Advanced obfuscation: f.u.c.k with dots",
    "Unicode test: fаck (using Cyrillic 'а')",
    "Symbol test: f@ck with @ symbol",
    "Number insertion: f1u2c3k",
    "Character repetition: fuuuuck",
    "Character omission: fck (missing 'u')",
    "Character addition: fucck (extra 'c')",
    "Character swap: fukc (swapped 'c' and 'k')",
    "Mixed separators: f_u.c-k",
    "Leetspeak with symbols: f4ck",
    "Unicode full width: ｆｕｃｋ",
    "With prefixes/suffixes: thefucking",
    "Complex mix: F-u-4-c-k",
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
        
        {processingStats && isClient && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Processing Statistics</h4>
            <div className="grid grid-cols-3 gap-4 text-xs text-gray-600">
              <div>
                <span className="font-medium">Text Length:</span> {processingStats.textLength} chars
              </div>
              <div>
                <span className="font-medium">Total Variations:</span> {processingStats.totalVariations.toLocaleString()}
              </div>
              <div>
                <span className="font-medium">Processing Time:</span> {processingStats.processingTime.toFixed(2)}ms
              </div>
            </div>
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
