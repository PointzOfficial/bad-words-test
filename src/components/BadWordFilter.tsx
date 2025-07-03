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

// Custom function to detect variations of bad words with word boundary checking
const detectBadWordVariations = (text: string, badWordsList: string[]): string[] => {
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
  
  // Debug: Check if fuck is in the bad words list
  console.log('=== DEBUG: Bad words list analysis ===');
  console.log('Total bad words:', badWordsList.length);
  console.log('Contains "fuck":', badWordsList.some(word => word.toLowerCase() === 'fuck'));
  console.log('Contains "f*ck":', badWordsList.some(word => word.toLowerCase().includes('fuck')));
  console.log('Sample bad words:', badWordsList.slice(0, 20));
  
  badWordsList.forEach(badWord => {
    const lowerBadWord = badWord.toLowerCase();
    
    // Skip very short words that are likely false positives
    if (lowerBadWord.length < 3) return;
    
    // Skip common false positive words
    if (falsePositives.has(lowerBadWord)) return;
    
    // Check for exact word boundary match first
    if (checkWordExists(lowerBadWord, lowerText)) {
      detectedWords.push(badWord);
      return;
    }
    
    // Generate all possible variations
    const variations = generateWordVariations(lowerBadWord);
    
    // Debug logging for testing
    if (lowerBadWord === 'fuck') {
      console.log('=== DEBUG: Checking fuck variations ===');
      console.log('Original bad word:', badWord);
      console.log('Lower bad word:', lowerBadWord);
      console.log('Generated variations:', variations);
      console.log('Text to check:', lowerText);
      console.log('Bad words list length:', badWordsList.length);
      console.log('First 10 bad words:', badWordsList.slice(0, 10));
      
      // Test specific variations
      const testVariations = ['f-4-c-k', 'f u c k', 'f.u.c.k', 'fuck'];
      testVariations.forEach(variation => {
        const exists = checkWordExists(variation, lowerText);
        const directMatch = lowerText.includes(variation.toLowerCase());
        console.log(`Variation "${variation}": boundary=${exists}, direct=${directMatch}`);
      });
    }
    
          // Check if any variation exists in the text with word boundaries
      for (const variation of variations) {
        if (variation.length < 2) continue; // Skip very short variations
        
        // Debug: Log each variation check
        if (lowerBadWord === 'fuck') {
          console.log(`Checking variation: "${variation}"`);
        }
        
        if (checkWordExists(variation, lowerText)) {
          if (lowerBadWord === 'fuck') {
            console.log(`✓ Found match for variation: "${variation}"`);
          }
          detectedWords.push(badWord);
          break;
        }
        
        // Fallback: for hyphenated patterns, also check without word boundaries
        if (variation.includes('-') || variation.includes(' ') || variation.includes('.')) {
          if (lowerText.includes(variation.toLowerCase())) {
            if (lowerBadWord === 'fuck') {
              console.log(`✓ Found fallback match for variation: "${variation}"`);
            }
            detectedWords.push(badWord);
            break;
          }
        }
      }
  });
  
  const finalResult = [...new Set(detectedWords)];
  
  // Debug: Log final result
  console.log('=== DEBUG: Final detection result ===');
  console.log('Detected words array:', detectedWords);
  console.log('Final result (deduplicated):', finalResult);
  
  return finalResult;
};

// Optimized function to generate essential word variations
const generateWordVariations = (word: string): string[] => {
  if (!word || word.length === 0) return [];
  
  const variations: Set<string> = new Set();
  const maxVariations = 1000; // Limit to prevent freezing
  
  // Add original word
  variations.add(word);
  
  // Common separators
  const separators = ['-', ' ', '.', '_', '|', '/', '*', '+', '='];
  
  // Basic leetspeak substitutions (most common)
  const leetMap: { [key: string]: string[] } = {
    'a': ['4', '@'],
    'e': ['3'],
    'i': ['1', '!'],
    'o': ['0'],
    's': ['5', '$'],
    't': ['7']
  };
  
  // Generate basic variations with separators
  separators.forEach(sep => {
    const separated = word.split('').join(sep);
    variations.add(separated);
    
    // Mixed case with separators
    const mixedCase = word.split('').map((char, index) => 
      index % 2 === 0 ? char.toUpperCase() : char
    ).join(sep);
    variations.add(mixedCase);
  });
  
  // Generate leetspeak variations (limited)
  Object.entries(leetMap).forEach(([letter, substitutes]) => {
    if (word.includes(letter) && variations.size < maxVariations) {
      substitutes.forEach(sub => {
        const leetWord = word.replace(new RegExp(letter, 'g'), sub);
        variations.add(leetWord);
        
        // Add separated versions of leetspeak
        separators.slice(0, 3).forEach(sep => {
          if (variations.size < maxVariations) {
            variations.add(leetWord.split('').join(sep));
          }
        });
      });
    }
  });
  
  // Generate leetspeak variations with separators applied first
  // This creates variations like f-4-c-k from f-u-c-k
  const separatedVariations = Array.from(variations).filter(v => v.includes('-') || v.includes(' ') || v.includes('.'));
  
  separatedVariations.forEach(separatedWord => {
    Object.entries(leetMap).forEach(([letter, substitutes]) => {
      if (separatedWord.includes(letter) && variations.size < maxVariations) {
        substitutes.forEach(sub => {
          const leetSeparated = separatedWord.replace(new RegExp(letter, 'g'), sub);
          variations.add(leetSeparated);
        });
      }
    });
  });
  
  // Generate common unicode lookalikes
  const unicodeMap: { [key: string]: string[] } = {
    'a': ['а', 'α'],
    'e': ['е'],
    'i': ['і', 'ι'],
    'o': ['о', 'ο'],
    's': ['ѕ'],
    't': ['т', 'τ']
  };
  
  Object.entries(unicodeMap).forEach(([letter, substitutes]) => {
    if (word.includes(letter) && variations.size < maxVariations) {
      substitutes.forEach(sub => {
        const unicodeWord = word.replace(new RegExp(letter, 'g'), sub);
        variations.add(unicodeWord);
        
        // Add separated versions
        separators.slice(0, 2).forEach(sep => {
          if (variations.size < maxVariations) {
            variations.add(unicodeWord.split('').join(sep));
          }
        });
      });
    }
  });
  
  // Generate common character manipulations (limited)
  if (variations.size < maxVariations) {
    // Character repetition (most common)
    for (let i = 0; i < word.length && variations.size < maxVariations; i++) {
      const repeated = word.slice(0, i) + word[i].repeat(2) + word.slice(i + 1);
      variations.add(repeated);
    }
  }
  
  if (variations.size < maxVariations) {
    // Character omission (most common)
    for (let i = 0; i < word.length && variations.size < maxVariations; i++) {
      const omitted = word.slice(0, i) + word.slice(i + 1);
      if (omitted.length >= 2) {
        variations.add(omitted);
      }
    }
  }
  
  // Add common prefixes/suffixes (limited set)
  const commonPrefixes = ['the', 'a'];
  const commonSuffixes = ['ing', 'ed', 's'];
  
  commonPrefixes.forEach(prefix => {
    if (variations.size < maxVariations) {
      variations.add(prefix + word);
    }
  });
  
  commonSuffixes.forEach(suffix => {
    if (variations.size < maxVariations) {
      variations.add(word + suffix);
    }
  });
  
  const result = Array.from(variations);
  
  // Debug: Test leetspeak generation for "fuck"
  if (word === 'fuck') {
    console.log('=== DEBUG: Leetspeak generation for fuck ===');
    console.log('All variations:', result);
    console.log('Contains f-4-c-k:', result.includes('f-4-c-k'));
    console.log('Contains f-u-c-k:', result.includes('f-u-c-k'));
    console.log('Contains f4ck:', result.includes('f4ck'));
  }
  
  return result;
};

// Enhanced function to filter text with all variations using word boundaries
const filterTextWithVariations = (text: string, badWordsList: string[]): string => {
  if (!text || !badWordsList || badWordsList.length === 0) {
    return text;
  }
  
  let filteredText = text;
  
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
  
  badWordsList.forEach(badWord => {
    if (!badWord || typeof badWord !== 'string') return;
    
    const lowerBadWord = badWord.toLowerCase();
    const replacement = '*'.repeat(badWord.length);
    
    // Generate all variations for this word
    const variations = generateWordVariations(lowerBadWord);
    
    // Replace each variation with word boundaries
    variations.forEach(variation => {
      if (!variation || variation.length < 2) return;
      
      try {
        // Create word boundary pattern for the variation
        const escapedVariation = variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const boundaryPattern = new RegExp(`(^|[\\s\\W])${escapedVariation}([\\s\\W]|$)`, 'gi');
        
        // Replace with word boundaries preserved
        filteredText = filteredText.replace(boundaryPattern, (match, before, after) => {
          return before + replacement + after;
        });
      } catch (regexError) {
        console.warn(`Failed to create regex for variation: ${variation}`, regexError);
        // Fallback to simple string replacement with word boundaries
        const lowerText = filteredText.toLowerCase();
        const lowerVariation = variation.toLowerCase();
        const index = lowerText.indexOf(lowerVariation);
        
        if (index !== -1) {
          // Check if it's a word boundary
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
    });
  });
  
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

  // Handle client-side initialization
  useEffect(() => {
    setIsClient(true);
  }, []);

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
      
      // Debug: Check what bad-words library detects
      console.log('=== DEBUG: Bad-words library analysis ===');
      console.log('Text processed:', textToProcess);
      console.log('Bad words detected:', badWordsDetected);
      console.log('Bad words filtered:', badWordsFiltered);
      console.log('Bad words list length:', badWordsWords.length);
      console.log('Bad words list sample:', badWordsWords.slice(0, 10));
      
      // Use enhanced detection for variations
      console.log('=== DEBUG: About to call detectBadWordVariations ===');
      const badWordsWordsFiltered = detectBadWordVariations(textToProcess, badWordsWords);
      const badWordsWordsFilteredSet = [...new Set(badWordsWordsFiltered)];
      console.log('=== DEBUG: detectBadWordVariations returned ===');
      console.log('Raw result:', badWordsWordsFiltered);
      console.log('Deduplicated result:', badWordsWordsFilteredSet);
      
      // Debug: Test simple detection
      console.log('=== DEBUG: Simple detection test ===');
      const testText = 'f-4-c-k';
      console.log('Testing text:', testText);
      console.log('Contains "f-4-c-k":', testText.toLowerCase().includes('f-4-c-k'));
      console.log('Contains "fuck":', testText.toLowerCase().includes('fuck'));
      console.log('Bad words detected by enhanced detection:', badWordsWordsFilteredSet);
      
      // Test word boundary detection directly
      console.log('=== DEBUG: Word boundary test ===');
      const testVariations = ['f-4-c-k', 'f-u-c-k', 'fuck'];
      testVariations.forEach(variation => {
        // Simple substring test
        const directMatch = 'testing leetspeak: f-4-c-k'.toLowerCase().includes(variation.toLowerCase());
        console.log(`"${variation}" in "testing leetspeak: f-4-c-k": ${directMatch}`);
      });
      
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
      const timeoutId = setTimeout(processText, 500);
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
