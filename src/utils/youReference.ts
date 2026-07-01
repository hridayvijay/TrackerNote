export function substituteYou(text: string, currentUserDisplayName: string): string {
  if (!text || !currentUserDisplayName) return text;
  
  const escapedName = currentUserDisplayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let result = text;
  
  const rules = [
    { regex: new RegExp(`(^|[.!?]\\s+|\\b)${escapedName}\\s+has\\s+to\\b`, 'gi'), replacement: 'You have to', lower: 'you have to' },
    { regex: new RegExp(`(^|[.!?]\\s+|\\b)${escapedName}\\s+needs\\s+to\\b`, 'gi'), replacement: 'You need to', lower: 'you need to' },
    { regex: new RegExp(`(^|[.!?]\\s+|\\b)${escapedName}\\s+should\\b`, 'gi'), replacement: 'You should', lower: 'you should' },
  ];

  rules.forEach(rule => {
    result = result.replace(rule.regex, (match, prefix) => {
      if (prefix === '' || /[.!?]\s+/.test(prefix)) {
        return prefix + rule.replacement;
      }
      return prefix + rule.lower;
    });
  });

  const nameRegex = new RegExp(`(^|[.!?]\\s+|\\b)(${escapedName})\\b`, 'gi');
  result = result.replace(nameRegex, (match, prefix) => {
    if (prefix === '' || /[.!?]\s+/.test(prefix)) {
      return prefix + 'You';
    } else {
      return prefix + 'you';
    }
  });

  return result;
}
