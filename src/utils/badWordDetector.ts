import { Filter } from "bad-words";
import {
  RegExpMatcher,
  TextCensor,
  englishDataset,
  englishRecommendedTransformers,
} from "obscenity";

export interface FilterResult {
  original: string;
  filtered: string;
  detectedWords: string[];
  isClean: boolean;
}

// Optimized leetspeak mapping with only most common substitutions
const leetspeakMap: { [key: string]: string[] } = {
  'a': ['@', '4'],
  'e': ['3'],
  'i': ['1', '!'],
  'o': ['0'],
  's': ['$', '5'],
  't': ['7'],
};

// Cache for generated variations to avoid recomputation
const variationCache = new Map<string, string[]>();

// Optimized function to generate word variations with caching
const generateWordVariations = (word: string): string[] => {
  if (!word || word.length < 3) return [];
  
  // Check cache first
  const cacheKey = word.toLowerCase();
  if (variationCache.has(cacheKey)) {
    return variationCache.get(cacheKey)!;
  }
  
  const variations: Set<string> = new Set();
  const lowerWord = word.toLowerCase();
  
  // Add basic variations
  variations.add(word);
  variations.add(lowerWord);
  variations.add(word.toUpperCase());
  
  // Generate mixed case variation
  const mixedCase = word.split('').map((char, index) => 
    index % 2 === 0 ? char.toUpperCase() : char.toLowerCase()
  ).join('');
  variations.add(mixedCase);
  
  // Generate underscore variation
  const underscoreVariation = word.split('').join('_');
  variations.add(underscoreVariation);
  variations.add(underscoreVariation.toLowerCase());
  variations.add(underscoreVariation.toUpperCase());
  
  // Generate leetspeak variations (only for common letters)
  let leetspeakWord = lowerWord;
  Object.entries(leetspeakMap).forEach(([letter, substitutes]) => {
    if (leetspeakWord.includes(letter)) {
      substitutes.forEach(substitute => {
        const newWord = leetspeakWord.replace(new RegExp(letter, 'g'), substitute);
        variations.add(newWord);
        variations.add(newWord.toUpperCase());
        
        // Underscore version of leetspeak
        const leetspeakUnderscore = newWord.split('').join('_');
        variations.add(leetspeakUnderscore);
        variations.add(leetspeakUnderscore.toUpperCase());
      });
    }
  });
  
  // Generate number substitution variation
  const numberWord = lowerWord
    .replace(/a/g, '4')
    .replace(/e/g, '3')
    .replace(/i/g, '1')
    .replace(/o/g, '0')
    .replace(/s/g, '5')
    .replace(/t/g, '7');
  variations.add(numberWord);
  variations.add(numberWord.toUpperCase());
  
  // Underscore version of number word
  const numberUnderscoreWord = numberWord.split('').join('_');
  variations.add(numberUnderscoreWord);
  variations.add(numberUnderscoreWord.toUpperCase());
  
  // Generate character repetition variations (only for first and last characters)
  const chars = lowerWord.split('');
  if (chars.length > 0) {
    // Repeat first character
    const firstRepeated = chars[0] + chars[0] + chars.slice(1).join('');
    variations.add(firstRepeated);
    variations.add(firstRepeated.toUpperCase());
    
    // Repeat last character
    if (chars.length > 1) {
      const lastRepeated = chars.slice(0, -1).join('') + chars[chars.length - 1] + chars[chars.length - 1];
      variations.add(lastRepeated);
      variations.add(lastRepeated.toUpperCase());
    }
  }
  
  // Generate character omission variations (only for middle characters)
  if (chars.length > 3) {
    for (let i = 1; i < chars.length - 1; i++) {
      const omitted = chars.slice(0, i).join('') + chars.slice(i + 1).join('');
      variations.add(omitted);
      variations.add(omitted.toUpperCase());
    }
  }
  
  const result = Array.from(variations);
  
  // Cache the result
  variationCache.set(cacheKey, result);
  
  return result;
};

// Optimized function to detect bad word variations
const detectBadWordVariations = (text: string, badWordsList: string[]): string[] => {
  if (!text || !badWordsList || badWordsList.length === 0) return [];
  
  const detectedWords: string[] = [];
  const lowerText = text.toLowerCase();
  
  // Pre-compile regex patterns for better performance
  const wordBoundaryPattern = /(\b|\W)/g;
  
  // Helper function to check if a word exists in text
  const checkWordExists = (word: string): boolean => {
    const lowerWord = word.toLowerCase();
    
    // Exact match check
    if (lowerText === lowerWord) return true;
    
    // Word boundary check with pre-compiled pattern
    const escapedWord = lowerWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const boundaryPattern = new RegExp(`(^|\\b|\\W)${escapedWord}(\\b|\\W|$)`, 'i');
    if (boundaryPattern.test(text)) return true;
    
    // Underscore pattern check
    if (lowerWord.includes('_') && lowerText.includes(lowerWord)) return true;
    
    // Check without underscores
    const withoutUnderscores = lowerWord.replace(/_/g, '');
    if (withoutUnderscores.length >= 3) {
      const escapedWithoutUnderscores = withoutUnderscores.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`(^|\\b|\\W)${escapedWithoutUnderscores}(\\b|\\W|$)`, 'i');
      if (pattern.test(text)) return true;
    }
    
    return false;
  };
  
  // Process bad words with early exit
  for (const badWord of badWordsList) {
    const lowerBadWord = badWord.toLowerCase();
    
    // Skip very short words
    if (lowerBadWord.length < 3) continue;
    
    // Check for exact word boundary match first
    if (checkWordExists(lowerBadWord)) {
      detectedWords.push(badWord);
      continue;
    }
    
    // Generate variations only if needed
    const variations = generateWordVariations(lowerBadWord);
    
    // Check variations with early exit
    for (const variation of variations) {
      if (variation.length < 2) continue;
      
      if (checkWordExists(variation)) {
        detectedWords.push(badWord);
        break; // Found a match, no need to check more variations
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
  
  // Process each bad word
  for (const badWord of badWordsList) {
    if (!badWord || typeof badWord !== 'string' || badWord.length < 3) continue;
    
    const lowerBadWord = badWord.toLowerCase();
    const replacement = '*'.repeat(badWord.length);
    
    // Generate variations for this word
    const variations = generateWordVariations(lowerBadWord);
    
    // Replace each variation
    for (const variation of variations) {
      if (!variation || variation.length < 2) continue;
      
      try {
        const escapedVariation = variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Word boundary replacement
        const boundaryPattern = new RegExp(`(^|\\b|\\W)${escapedVariation}(\\b|\\W|$)`, 'gi');
        filteredText = filteredText.replace(boundaryPattern, (match, before, after) => {
          return before + replacement + after;
        });
        
        // Simple pattern replacement for underscore variations
        if (variation.includes('_')) {
          const simplePattern = new RegExp(escapedVariation, 'gi');
          filteredText = filteredText.replace(simplePattern, replacement);
        }
        
        // Replace without underscores
        const withoutUnderscores = variation.replace(/_/g, '');
        if (withoutUnderscores.length >= 3) {
          const escapedWithoutUnderscores = withoutUnderscores.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const pattern = new RegExp(`(^|\\b|\\W)${escapedWithoutUnderscores}(\\b|\\W|$)`, 'gi');
          filteredText = filteredText.replace(pattern, (match, before, after) => {
            return before + replacement + after;
          });
        }
        
      } catch (regexError) {
        // Fallback to simple string replacement
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

// Singleton pattern for filter initialization
let badWordsFilter: Filter | null = null;
let obscenityMatcher: RegExpMatcher | null = null;
let obscenityCensor: TextCensor | null = null;

const initializeFilters = () => {
  if (!badWordsFilter) {
    badWordsFilter = new Filter();
  }
  if (!obscenityMatcher) {
    obscenityMatcher = new RegExpMatcher({
      ...englishDataset.build(),
      ...englishRecommendedTransformers,
    });
  }
  if (!obscenityCensor) {
    obscenityCensor = new TextCensor();
  }
};

// Main export function for Combined (Both Libraries) detection
export const detectBadWordsCombined = (text: string): FilterResult => {
  if (!text || !text.trim()) {
    return {
      original: text,
      filtered: text,
      detectedWords: [],
      isClean: true,
    };
  }

  // Initialize filters
  initializeFilters();

  // Process with bad-words library
  const badWordsList = badWordsFilter!.list;
  const detectedWords = detectBadWordVariations(text, badWordsList);
  const detectedWordsSet = [...new Set(detectedWords)];
  const filteredText = filterTextWithVariations(text, badWordsList);
  const hasBadWords = detectedWordsSet.length > 0;
  
  // Process with obscenity library
  const obscenityDetected = obscenityMatcher!.hasMatch(text);
  const obscenityMatches = obscenityDetected
    ? obscenityMatcher!.getAllMatches(text, true)
    : [];

  const obscenityWords = obscenityMatches.map((match) => {
    const payload = englishDataset.getPayloadWithPhraseMetadata(match);
    return payload.phraseMetadata?.originalWord || "unknown";
  });

  // Combine results
  let combinedFiltered = text;
  const combinedDetectedWords: string[] = [];

  if (hasBadWords) {
    combinedFiltered = filterTextWithVariations(combinedFiltered, badWordsList);
    combinedDetectedWords.push(...detectedWordsSet);
  }

  if (obscenityDetected) {
    // Apply obscenity filtering
    const obscenityMatchesCombined = obscenityMatcher!.getAllMatches(
      combinedFiltered,
      true
    );
    combinedFiltered = obscenityCensor!.applyTo(
      combinedFiltered,
      obscenityMatchesCombined
    );

    const obscenityWordsCombined = obscenityMatchesCombined.map((match) => {
      const payload = englishDataset.getPayloadWithPhraseMetadata(match);
      return payload.phraseMetadata?.originalWord || "unknown";
    });
    combinedDetectedWords.push(...obscenityWordsCombined);
  }

  return {
    original: text,
    filtered: combinedFiltered,
    detectedWords: combinedDetectedWords,
    isClean: !hasBadWords && !obscenityDetected,
  };
};

// Export individual detection functions for specific use cases
export const detectBadWordsOnly = (text: string): FilterResult => {
  if (!text || !text.trim()) {
    return {
      original: text,
      filtered: text,
      detectedWords: [],
      isClean: true,
    };
  }

  initializeFilters();
  const badWordsList = badWordsFilter!.list;
  const detectedWords = detectBadWordVariations(text, badWordsList);
  const detectedWordsSet = [...new Set(detectedWords)];
  const filteredText = filterTextWithVariations(text, badWordsList);
  const hasBadWords = detectedWordsSet.length > 0;

  return {
    original: text,
    filtered: filteredText,
    detectedWords: detectedWordsSet,
    isClean: !hasBadWords,
  };
};

export const detectObscenityOnly = (text: string): FilterResult => {
  if (!text || !text.trim()) {
    return {
      original: text,
      filtered: text,
      detectedWords: [],
      isClean: true,
    };
  }

  initializeFilters();
  const obscenityDetected = obscenityMatcher!.hasMatch(text);
  const obscenityMatches = obscenityDetected
    ? obscenityMatcher!.getAllMatches(text, true)
    : [];
  const obscenityFiltered = obscenityCensor!.applyTo(
    text,
    obscenityMatches
  );

  const obscenityWords = obscenityMatches.map((match) => {
    const payload = englishDataset.getPayloadWithPhraseMetadata(match);
    return payload.phraseMetadata?.originalWord || "unknown";
  });

  return {
    original: text,
    filtered: obscenityFiltered,
    detectedWords: obscenityWords,
    isClean: !obscenityDetected,
  };
}; 