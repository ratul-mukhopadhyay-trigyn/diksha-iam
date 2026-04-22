function toTitleCase(str) {
  return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}

function formatText(value) {
  if (!value || typeof value !== 'string') return value;

  const upperCaseList = [
    'igot-health', 'cbse/ncert', 'cbse', 'ncert', 'cisce', 'nios', 'cpd',
    'ict', 'nss', 'aas pass (evs)', 'craft', 'ecce', 'evs', 'gka',
    'tamil(at)', 'tamil(bt)', 'spcc', 'nyks', 'nursing', 'nep',
    'manipuri lairik laisu (meetei mayek)', 'looking around (evs)',
    'kannada(bt)', 'ircs',
  ];
  const titleCaseList = [
    'cbse training', 'evs part 1', 'evs part 2', 'ict in education', 'nss volunteers',
  ];

  const lower = value.toLowerCase();

  if (upperCaseList.includes(lower)) {
    return value.toUpperCase();
  }

  if (titleCaseList.includes(lower)) {
    const words = value.split(' ');
    return words[0].toUpperCase() + ' ' + toTitleCase(words.slice(1).join(' '));
  }

  if (lower.startsWith('state') && value.includes('(') && value.includes(')')) {
    return toTitleCase(value.replace(/\bState\b|\(|\)/gi, '').trim());
  }

  if (lower.startsWith('ut') && value.includes('(') && value.includes(')')) {
    const inner = value.replace(/\but\b|\(|\)/gi, '').trim();
    if (inner.toLowerCase() === 'dnh and dd') {
      return 'Dadra & Nagar Haveli & Daman & Diu';
    }
    return toTitleCase(inner);
  }

  return toTitleCase(value);
}

module.exports = {
  formatText,
  toTitleCase,
};
