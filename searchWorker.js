self.onmessage = function(e) {
  const { term, content, options } = e.data;
  const results = [];

  if (!content || !term) {
    self.postMessage({ results });
    return;
  }

  const lines = content.split('\n');
  const caseSensitive = options.matchCase;
  const searchText = caseSensitive ? term : term.toLowerCase();

  lines.forEach((line, lineIndex) => {
    const lineText = caseSensitive ? line : line.toLowerCase();
    let startIndex = 0;
    
    while (true) {
      const index = lineText.indexOf(searchText, startIndex);
      if (index === -1) break;
      
      results.push({
        line: lineIndex + 1,
        text: line,
        startIndex: index,
        endIndex: index + term.length
      });
      
      startIndex = index + 1;
    }
  });

  self.postMessage({ results });
};