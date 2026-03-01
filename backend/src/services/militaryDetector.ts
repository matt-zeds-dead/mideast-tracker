/**
 * Military/Security Content Detector
 * Uses keyword matching to flag military-related news
 */

const MILITARY_KEYWORDS = [
  'military', 'army', 'navy', 'airforce', 'air force', 'troops', 'soldiers',
  'armed forces', 'defense', 'defence', 'warship', 'strike', 'airstrike',
  'missile', 'bomb', 'explosion', 'attack', 'conflict', 'war', 'warfare',
  'combat', 'battle', 'operation', 'raid', 'drone strike', 'terrorism',
  'terrorist', 'isis', 'hamas', 'hezbollah', 'houthi', 'iran', 'irgc',
  'nuclear', 'weapons', 'arsenal', 'idf', 'coalition', 'naval base',
  'fighter jet', 'patriot', 'ballistic', 'uae military', 'emirati forces',
  'exercise', 'drill', 'maneuver', 'sanctions',
];

const SECURITY_KEYWORDS = [
  'arrest', 'detained', 'intelligence', 'spy', 'surveillance', 'intercepted',
  'border', 'coastguard', 'smuggling', 'threat level', 'security alert',
];

const HIGH_SEVERITY_KEYWORDS = [
  'explosion', 'airstrike', 'missile', 'nuclear', 'chemical weapon',
  'mass casualty', 'emergency', 'evacuation',
];

export interface MilitaryAnalysis {
  isMilitary: boolean;
  category: 'military' | 'security' | 'politics' | 'economy' | 'general';
  matchedKeywords: string[];
  severity: 'low' | 'medium' | 'high';
}

export function analyzeMilitaryContent(text: string): MilitaryAnalysis {
  const lowerText = text.toLowerCase();
  const matchedMilitary: string[] = [];
  const matchedSecurity: string[] = [];
  const matchedHigh: string[] = [];

  for (const kw of MILITARY_KEYWORDS) {
    if (lowerText.includes(kw)) matchedMilitary.push(kw);
  }
  for (const kw of SECURITY_KEYWORDS) {
    if (lowerText.includes(kw)) matchedSecurity.push(kw);
  }
  for (const kw of HIGH_SEVERITY_KEYWORDS) {
    if (lowerText.includes(kw)) matchedHigh.push(kw);
  }

  const isMilitary = matchedMilitary.length > 0;
  const isSecurity = matchedSecurity.length > 0;

  let category: MilitaryAnalysis['category'] = 'general';
  if (isMilitary) category = 'military';
  else if (isSecurity) category = 'security';
  else if (/minister|government|president|parliament|election/.test(lowerText)) category = 'politics';
  else if (/economy|gdp|oil|trade|market|investment/.test(lowerText)) category = 'economy';

  let severity: MilitaryAnalysis['severity'] = 'low';
  if (matchedHigh.length > 0) severity = 'high';
  else if (matchedMilitary.length >= 2) severity = 'medium';

  return {
    isMilitary: isMilitary || isSecurity,
    category,
    matchedKeywords: [...matchedMilitary, ...matchedSecurity],
    severity,
  };
}
