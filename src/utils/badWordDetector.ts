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

// Comprehensive leetspeak mapping based on obscenity library
const leetspeakMap: { [key: string]: string[] } = {
  'a': ['@', '4', 'а', 'Α', 'Ａ'],
  'b': ['8', '6', 'в', 'Β', 'Ｂ'],
  'c': ['(', 'с', 'С', 'Ｃ'],
  'd': ['d', 'D', 'Ｄ'],
  'e': ['3', 'е', 'Ε', 'Ｅ'],
  'f': ['f', 'F', 'Ｆ'],
  'g': ['6', '9', 'g', 'G', 'Ｇ'],
  'h': ['h', 'H', 'Ｈ'],
  'i': ['1', '!', '|', 'l', 'L', 'ｉ', 'Ｉ'],
  'j': ['j', 'J', 'Ｊ'],
  'k': ['k', 'K', 'Ｋ'],
  'l': ['1', '|', 'l', 'L', 'Ｌ'],
  'm': ['m', 'M', 'Ｍ'],
  'n': ['n', 'N', 'Ｎ'],
  'o': ['0', 'о', 'Ο', 'Ｏ'],
  'p': ['p', 'P', 'Ｐ'],
  'q': ['q', 'Q', 'Ｑ'],
  'r': ['r', 'R', 'Ｒ'],
  's': ['$', '5', 's', 'S', 'Ｓ'],
  't': ['7', 't', 'T', 'Ｔ'],
  'u': ['u', 'U', 'Ｕ'],
  'v': ['v', 'V', 'Ｖ'],
  'w': ['w', 'W', 'Ｗ'],
  'x': ['x', 'X', 'Ｘ'],
  'y': ['y', 'Y', 'Ｙ'],
  'z': ['2', 'z', 'Z', 'Ｚ']
};

// Enhanced function to generate comprehensive word variations
const generateWordVariations = (word: string): string[] => {
  if (!word || word.length === 0) return [];
  
  const variations: Set<string> = new Set();
  
  // Add original word and case variations
  variations.add(word);
  variations.add(word.toLowerCase());
  variations.add(word.toUpperCase());
  
  // Generate mixed case variations
  const mixedCase = word.split('').map((char, index) => 
    index % 2 === 0 ? char.toUpperCase() : char.toLowerCase()
  ).join('');
  variations.add(mixedCase);
  
  // Generate underscore variations
  const underscoreVariations = word.split('').join('_');
  variations.add(underscoreVariations);
  variations.add(underscoreVariations.toLowerCase());
  variations.add(underscoreVariations.toUpperCase());
  
  // Generate leetspeak variations
  let leetspeakWord = word;
  Object.entries(leetspeakMap).forEach(([letter, substitutes]) => {
    if (leetspeakWord.toLowerCase().includes(letter)) {
      substitutes.forEach(substitute => {
        const newWord = leetspeakWord.replace(new RegExp(letter, 'gi'), substitute);
        variations.add(newWord);
        variations.add(newWord.toLowerCase());
        variations.add(newWord.toUpperCase());
        
        // Underscore version of leetspeak
        const leetspeakUnderscore = newWord.split('').join('_');
        variations.add(leetspeakUnderscore);
        variations.add(leetspeakUnderscore.toLowerCase());
        variations.add(leetspeakUnderscore.toUpperCase());
      });
    }
  });
  
  // Generate number substitutions (common ones)
  const numberMap: { [key: string]: string } = {
    'a': '4',
    'e': '3',
    'i': '1',
    'o': '0',
    's': '5',
    't': '7'
  };
  
  let numberWord = word;
  Object.entries(numberMap).forEach(([letter, number]) => {
    numberWord = numberWord.replace(new RegExp(letter, 'gi'), number);
  });
  variations.add(numberWord);
  variations.add(numberWord.toLowerCase());
  variations.add(numberWord.toUpperCase());
  
  // Underscore version of number word
  const numberUnderscoreWord = numberWord.split('').join('_');
  variations.add(numberUnderscoreWord);
  variations.add(numberUnderscoreWord.toLowerCase());
  variations.add(numberUnderscoreWord.toUpperCase());
  
  // Generate character repetition variations
  const chars = word.split('');
  for (let i = 0; i < chars.length; i++) {
    const repeated = [...chars.slice(0, i), chars[i], chars[i], ...chars.slice(i + 1)].join('');
    variations.add(repeated);
    variations.add(repeated.toLowerCase());
    variations.add(repeated.toUpperCase());
  }
  
  // Generate character omission variations
  for (let i = 0; i < chars.length; i++) {
    const omitted = [...chars.slice(0, i), ...chars.slice(i + 1)].join('');
    if (omitted.length >= 3) {
      variations.add(omitted);
      variations.add(omitted.toLowerCase());
      variations.add(omitted.toUpperCase());
    }
  }
  
  // Generate character addition variations
  for (let i = 0; i < chars.length; i++) {
    const added = [...chars.slice(0, i), chars[i], chars[i], ...chars.slice(i)].join('');
    variations.add(added);
    variations.add(added.toLowerCase());
    variations.add(added.toUpperCase());
  }
  
  return Array.from(variations);
};

// Enhanced function to detect bad word variations with comprehensive checking
const detectBadWordVariations = (text: string, badWordsList: string[]): string[] => {
  if (!text || !badWordsList || badWordsList.length === 0) return [];
  
  const detectedWords: string[] = [];
  const lowerText = text.toLowerCase();
  
  // Helper function to check if a word exists in text with multiple strategies
  const checkWordExists = (word: string, text: string): boolean => {
    const lowerWord = word.toLowerCase();
    const lowerText = text.toLowerCase();
    
    // Strategy 1: Exact match (case insensitive)
    if (lowerText === lowerWord) return true;
    
    // Strategy 2: Word boundary check
    const escapedWord = lowerWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const boundaryPattern = new RegExp(`(^|[\\s\\W])${escapedWord}([\\s\\W]|$)`, 'gi');
    if (boundaryPattern.test(text)) return true;
    
    // Strategy 3: Simple inclusion check (for underscore patterns)
    if (lowerWord.includes('_')) {
      if (lowerText.includes(lowerWord)) return true;
    }
    
    // Strategy 4: Check without underscores
    const withoutUnderscores = lowerWord.replace(/_/g, '');
    if (withoutUnderscores.length >= 3) {
      const escapedWithoutUnderscores = withoutUnderscores.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`(^|[\\s\\W])${escapedWithoutUnderscores}([\\s\\W]|$)`, 'gi');
      if (pattern.test(text)) return true;
    }
    
    // Strategy 5: Check with spaces instead of underscores
    const withSpaces = lowerWord.replace(/_/g, ' ');
    if (withSpaces !== lowerWord) {
      const escapedWithSpaces = withSpaces.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`(^|[\\s\\W])${escapedWithSpaces}([\\s\\W]|$)`, 'gi');
      if (pattern.test(text)) return true;
    }
    
    return false;
  };
  
  // Process bad words from bad-words library
  for (const badWord of badWordsList) {
    const lowerBadWord = badWord.toLowerCase();
    
    // Skip very short words
    if (lowerBadWord.length < 3) continue;
    
    // Check for exact word boundary match first
    if (checkWordExists(lowerBadWord, text)) {
      detectedWords.push(badWord);
      continue;
    }
    
    // Generate variations
    const variations = generateWordVariations(lowerBadWord);
    
    // Check variations
    for (const variation of variations) {
      if (variation.length < 2) continue;
      
      if (checkWordExists(variation, text)) {
        detectedWords.push(badWord);
        break;
      }
    }
  }
  
  return [...new Set(detectedWords)];
};

// Enhanced filtering function with comprehensive replacement
const filterTextWithVariations = (text: string, badWordsList: string[]): string => {
  if (!text || !badWordsList || badWordsList.length === 0) {
    return text;
  }
  
  let filteredText = text;
  
  // Process each bad word from bad-words library
  for (const badWord of badWordsList) {
    if (!badWord || typeof badWord !== 'string') continue;
    
    const lowerBadWord = badWord.toLowerCase();
    const replacement = '*'.repeat(badWord.length);
    
    // Generate variations for this word
    const variations = generateWordVariations(lowerBadWord);
    
    // Replace each variation with multiple strategies
    for (const variation of variations) {
      if (!variation || variation.length < 2) continue;
      
      try {
        const escapedVariation = variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Strategy 1: Word boundary replacement
        const boundaryPattern = new RegExp(`(^|[\\s\\W])${escapedVariation}([\\s\\W]|$)`, 'gi');
        filteredText = filteredText.replace(boundaryPattern, (match, before, after) => {
          return before + replacement + after;
        });
        
        // Strategy 2: Simple pattern replacement for underscore variations
        if (variation.includes('_')) {
          const simplePattern = new RegExp(escapedVariation, 'gi');
          filteredText = filteredText.replace(simplePattern, replacement);
        }
        
        // Strategy 3: Replace without underscores
        const withoutUnderscores = variation.replace(/_/g, '');
        if (withoutUnderscores.length >= 3) {
          const escapedWithoutUnderscores = withoutUnderscores.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const pattern = new RegExp(`(^|[\\s\\W])${escapedWithoutUnderscores}([\\s\\W]|$)`, 'gi');
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

// Initialize filters (singleton pattern)
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

  // Process with bad-words library (enhanced with variations detection)
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

  // Process with combined approach
  let combinedFiltered = text;
  const combinedDetectedWords: string[] = [];

  if (hasBadWords) {
    combinedFiltered = filterTextWithVariations(combinedFiltered, badWordsList);
    combinedDetectedWords.push(...detectedWordsSet);
  }

  if (obscenityDetected) {
    // Apply obscenity filtering to the already filtered text
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