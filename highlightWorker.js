// Optimized highlight worker for better performance
let lastWord = '';
let lastContent = '';
let lastRanges = [];
let lastType = '';
let lastTabId = '';

// Cache for regex patterns to avoid recompilation
const regexCache = new Map();

function getRegex(word, wholeWord = false) {
  const cacheKey = `${word}-${wholeWord}`;
  if (regexCache.has(cacheKey)) {
    return regexCache.get(cacheKey);
  }
  
  // Escape special regex characters
  //const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\// Optimized highlight worker for better performance
  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let lastWord = '';
let lastContent = '';
let lastRanges = [];
let lastType = '';

// Cache for regex patterns to avoid recompilation
const regexCache = new Map();

function getRegex(word, wholeWord = false) {
  const cacheKey = `${word}-${wholeWord}`;
  if (regexCache.has(cacheKey)) {
    return regexCache.get(cacheKey);
  }
  
  // Escape special regex characters
  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = wholeWord ? `\\b${escapedWord}\\b` : escapedWord;
  const regex = new RegExp(pattern, 'gi');
  
  // Limit cache size to prevent memory issues
  if (regexCache.size > 100) {
    const firstKey = regexCache.keys().next().value;
    regexCache.delete(firstKey);
  }
  
  regexCache.set(cacheKey, regex);
  return regex;
}

function findMatches(word, content, type = 'highlight') {
  // Early return for empty or very short words
  if (!word || word.length < 2) {
    return [];
  }
  
  // Check cache for same word and content
  if (word === lastWord && content === lastContent && type === lastType) {
    return lastRanges;
  }
  
  // Limit processing for very large files or very long words
  if (content.length > 1000000 || word.length > 100) {
    return [];
  }
  
  const ranges = [];
  let match;
  
  // Use whole word matching for occurrence highlighting
  const regex = getRegex(word, type === 'occurrence');
  const lines = content.split('\n');
  
  let matchCount = 0;
  const maxMatches = 1000; // Limit matches for performance
  
  for (let lineIndex = 0; lineIndex < lines.length && matchCount < maxMatches; lineIndex++) {
    const line = lines[lineIndex];
    regex.lastIndex = 0; // Reset regex for each line
    
    while ((match = regex.exec(line)) !== null && matchCount < maxMatches) {
      ranges.push({
        startLineNumber: lineIndex + 1,
        startColumn: match.index + 1,
        endLineNumber: lineIndex + 1,
        endColumn: match.index + match[0].length + 1
      });
      
      matchCount++;
      
      // Prevent infinite loop for zero-length matches
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
    }
  }
  
  // Cache results
  lastWord = word;
  lastContent = content;
  lastRanges = ranges;
  lastType = type;
  
  return ranges;
}

// Handle messages from main thread
self.addEventListener('message', function(e) {
  const { word, content, type = 'highlight' } = e.data;
  
  try {
    const ranges = findMatches(word, content, type);
    
    // Send result back to main thread
    self.postMessage({
      ranges: ranges,
      type: type
    });
  } catch (error) {
    console.error('Worker error:', error);
    self.postMessage({
      ranges: [],
      type: type,
      error: error.message
    });
  }
});

// Clear cache periodically to prevent memory leaks
setInterval(() => {
  if (regexCache.size > 50) {
    regexCache.clear();
    lastWord = '';
    lastContent = '';
    lastRanges = [];
    lastType = '';
  }
}, 30000); // Clear every 30 seconds');
  const pattern = wholeWord ? `\\b${escapedWord}\\b` : escapedWord;
  const regex = new RegExp(pattern, 'gi');
  
  // Limit cache size to prevent memory issues
  if (regexCache.size > 100) {
    const firstKey = regexCache.keys().next().value;
    regexCache.delete(firstKey);
  }
  
  regexCache.set(cacheKey, regex);
  return regex;
}

function findMatches(word, content, type = 'highlight', tabId = '') {
  // Early return for empty or very short words
  if (!word || word.length < 2) {
    return [];
  }
  
  // Check cache for same word and content
  if (word === lastWord && content === lastContent && type === lastType && tabId === lastTabId) {
    return lastRanges;
  }
  
  // Limit processing for very large files or very long words
  if (content.length > 2000000 || word.length > 100) {
    return [];
  }
  
  const ranges = [];
  let match;
  
  // Use whole word matching for occurrence highlighting
  const regex = getRegex(word, type === 'occurrence');
  
  // For very large files, use optimized line-by-line processing
  if (content.length > 100000) {
    const lines = content.split('\n');
    let matchCount = 0;
    const maxMatches = type === 'occurrence' ? 500 : 1000;
    
    for (let lineIndex = 0; lineIndex < lines.length && matchCount < maxMatches; lineIndex++) {
      const line = lines[lineIndex];
      if (line.length > 1000) continue; // Skip very long lines
      
      regex.lastIndex = 0;
      
      while ((match = regex.exec(line)) !== null && matchCount < maxMatches) {
        ranges.push({
          startLineNumber: lineIndex + 1,
          startColumn: match.index + 1,
          endLineNumber: lineIndex + 1,
          endColumn: match.index + match[0].length + 1
        });
        
        matchCount++;
        
        if (match.index === regex.lastIndex) {
          regex.lastIndex++;
        }
      }
    }
  } else {
    // For smaller files, use direct regex matching
    let matchCount = 0;
    const maxMatches = type === 'occurrence' ? 500 : 1000;
    
    while ((match = regex.exec(content)) !== null && matchCount < maxMatches) {
      // Find line number and column
      const beforeMatch = content.substring(0, match.index);
      const lineNumber = (beforeMatch.match(/\n/g) || []).length + 1;
      const lastNewlineIndex = beforeMatch.lastIndexOf('\n');
      const column = match.index - lastNewlineIndex;
      
      ranges.push({
        startLineNumber: lineNumber,
        startColumn: column,
        endLineNumber: lineNumber,
        endColumn: column + match[0].length
      });
      
      matchCount++;
      
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
    }
  }
  
  // Cache results
  lastWord = word;
  lastContent = content;
  lastRanges = ranges;
  lastType = type;
  lastTabId = tabId;
  
  return ranges;
}

// Handle messages from main thread
self.addEventListener('message', function(e) {
  const { word, content, type = 'highlight', tabId = '' } = e.data;
  
  try {
    const startTime = performance.now();
    const ranges = findMatches(word, content, type, tabId);
    const endTime = performance.now();
    
    // Log performance for debugging
    if (endTime - startTime > 50) {
      console.log(`Worker processing took ${endTime - startTime}ms for ${ranges.length} matches`);
    }
    
    // Send result back to main thread
    self.postMessage({
      ranges: ranges,
      type: type,
      tabId: tabId,
      processingTime: endTime - startTime
    });
  } catch (error) {
    console.error('Worker error:', error);
    self.postMessage({
      ranges: [],
      type: type,
      tabId: tabId,
      error: error.message
    });
  }
});

// Clear cache periodically to prevent memory leaks
setInterval(() => {
  if (regexCache.size > 50) {
    regexCache.clear();
    lastWord = '';
    lastContent = '';
    lastRanges = [];
    lastType = '';
    lastTabId = '';
  }
}, 30000); // Clear every 30 seconds