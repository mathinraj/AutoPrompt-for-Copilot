const PromptParser = {
  fromText(text) {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  },

  fromCSV(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return [];

    const header = lines[0].toLowerCase();
    const hasHeader = header.includes('prompt') || header.includes('query') || header.includes('question');
    const startIdx = hasHeader ? 1 : 0;

    return lines.slice(startIdx).map(line => {
      const parts = line.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g);
      if (!parts) return line;
      const lastPart = parts[parts.length - 1]
        .replace(/^,/, '')
        .replace(/^"(.*)"$/, '$1')
        .replace(/""/g, '"')
        .trim();
      return lastPart;
    }).filter(p => p.length > 0);
  },

  fromJSON(text) {
    const data = JSON.parse(text);

    if (Array.isArray(data)) {
      return data.map(item => {
        if (typeof item === 'string') return item.trim();
        if (item.prompt) return item.prompt.trim();
        if (item.query) return item.query.trim();
        if (item.question) return item.question.trim();
        return String(item).trim();
      }).filter(p => p.length > 0);
    }

    if (data.prompts && Array.isArray(data.prompts)) {
      return data.prompts.map(p => (typeof p === 'string' ? p : p.prompt || p.query || '').trim()).filter(p => p.length > 0);
    }

    return [];
  },

  parseFile(content, filename) {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'json': return this.fromJSON(content);
      case 'csv':  return this.fromCSV(content);
      case 'txt':
      default:     return this.fromText(content);
    }
  }
};
