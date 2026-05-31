import type { VercelRequest, VercelResponse } from '@vercel/node';
import { knowledgeBase } from './knowledge';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';
const MAX_MESSAGE_LENGTH = 4000;
const API_TIMEOUT = 30000;

function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[?!.]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectIntent(message: string, _history: { role: string; content: string }[] = []): 'knowledge' | 'general' | 'fallback' {
  const lower = normalizeQuery(message);
  
  const knowledgePatterns = [
    /current\s*ctc|ctc\s*is|salary|compensation|package/i,
    /expected\s*ctc|expected\s*salary|salary\s*expectation|how\s*much\s*is\s*he\s*expec/i,
    /notice|notice\s*period|joining|when\s*can/i,
    /location|where\s*is|based|located|pune/i,
    /current\s*role|present\s*role|working\s*as|working\s*on|job|position/i,
    /experience|total\s*experience|work\s*experience|career/i,
    /about\s*you|tell\s*me\s*about|who\s*are/i,
    /companies|employers|organizations|worked\s*with/i,
    /client|clients|hpe|kyndryl|cadence|teradyne/i,
    /ats|vms|tools|platform|portal|dice|monster|careerbuilder|indeed/i,
    /skill|skills|strength|strongest/i,
    /cybersecurity|soc|soc\s*analyst|vapt|noc|network\s*security|sicherheit|siem/i,
    /it\s*infra|infrastructure|backup|storage|dba|cloud|network|security\s*engineer/i,
    /education|degree|college|qualification|university/i,
    /certification|certifications|certified/i,
    /achievement|why\s*.*hire|why\s*hire|why\s*should/i,
    /global\s*hiring|countries|regions|us\s*recruitment|us\s*it/i,
    /stakeholder|account\s*management|vendor|rate\s*negotiation|contract/i,
    /managed\s*a\s*team|team\s*leader|leadership/i
  ];
  
  for (const pattern of knowledgePatterns) {
    if (pattern.test(lower)) {
      return 'knowledge';
    }
  }
  
  return 'general';
}

function getKnowledgeAnswer(message: string): string | null {
  const lower = normalizeQuery(message);
  
  if (lower.includes('expected ctc') || (lower.includes('expected') && !lower.includes('the'))) {
    return `My expected CTC is ${knowledgeBase.screeningInfo.expectedCTC}.`;
  }
  if (lower.includes('current ctc') || (lower.includes('ctc') && !lower.includes('expected')) || (lower.includes('salary') && !lower.includes('expect'))) {
    return `My current CTC is ${knowledgeBase.screeningInfo.currentCTC}.`;
  }
  if (lower.includes('notice period') || lower.includes('notice ')) {
    return `My notice period is ${knowledgeBase.screeningInfo.noticePeriod}.`;
  }
  if (lower.includes('open to') || lower.includes('remote or hybrid') || lower.includes('hybrid') || lower.includes('relocation')) {
    return `I am ${knowledgeBase.screeningInfo.workModePreference.toLowerCase()} for work arrangements. I am ${knowledgeBase.screeningInfo.openToRelocation.toLowerCase()}.`;
  }
  if ((lower.includes('location') && !lower.includes('work')) || lower.includes('pune') || lower.includes('based') || lower.includes('located')) {
    return `My preferred location is ${knowledgeBase.screeningInfo.preferredLocation}, and I am ${knowledgeBase.screeningInfo.openToRelocation.toLowerCase()}.`;
  }
  if (lower.includes('current role') || lower.includes('present role') || lower.includes('working as') || lower.includes('currently working') || (lower.includes('what') && lower.includes('role'))) {
    return `I am currently working as ${knowledgeBase.personalInfo.currentRole} at Softenger. My responsibilities include managing a team of 15 recruiters, driving end-to-end recruitment delivery across US, Europe, Middle East, Singapore, and Malaysia markets, and handling Cybersecurity and IT Infrastructure hiring.`;
  }
  if (lower.includes('total experience') || lower.includes('experience') || lower.includes('years')) {
    return `I have 6+ years of recruitment experience across US IT recruitment, global IT hiring, staffing, consulting, account management, and stakeholder management. I have worked with Softenger, GP Aarogya Healthcare Technologies, Qualified Recruiter / Prestige Staffing, IMS / Experis, Mindlance, and Head Field Solution Pvt Ltd.`;
  }
  if (lower.includes('tell me about yourself') || lower.includes('about yourself') || lower.includes('who are')) {
    return `I am ${knowledgeBase.personalInfo.name}, a ${knowledgeBase.personalInfo.currentRole} based in ${knowledgeBase.personalInfo.location}. I have 6+ years of recruitment experience across US IT recruitment, global IT hiring, staffing, consulting, account management, and stakeholder management. I currently lead a team of 15 recruiters at Softenger and handle Cybersecurity and IT Infrastructure hiring.`;
  }
  if (lower.includes('join') || lower.includes('joining') || lower.includes('when can')) {
    return `My joining availability is ${knowledgeBase.screeningInfo.joiningAvailability}.`;
  }
  if (lower.includes('summarize') || lower.includes('profile for a recruiter')) {
    return `${knowledgeBase.personalInfo.name} - ${knowledgeBase.personalInfo.currentRole} at Softenger. 6+ years recruitment experience. Current CTC: ${knowledgeBase.screeningInfo.currentCTC}, Expected: ${knowledgeBase.screeningInfo.expectedCTC}, Notice: ${knowledgeBase.screeningInfo.noticePeriod}. Hiring domains: Cybersecurity, IT Infrastructure. Tools: Bullhorn, JobDiva, Ceipal, Fieldglass, LinkedIn Recruiter. Global hiring across US, Europe, Middle East, Singapore, Malaysia.`;
  }
  if (lower.includes('companies') || lower.includes('employers') || lower.includes('organizations worked')) {
    return `I have worked with companies including Softenger, GP Aarogya Healthcare Technologies, Qualified Recruiter / Prestige Staffing, IMS / Experis, Mindlance, Head Field Solution Pvt Ltd.`;
  }
  if (lower.includes('client') || (lower.includes('worked with') && !lower.includes('companies') && !lower.includes('organizations'))) {
    return `I have worked with clients like HPE, Kyndryl, Cadence, Teradyne, Credence, Atkins, Oracle, Amdocs, Tanla Platforms, Caterpillar, Cox Automotive, Bank of America, Wells Fargo, Citigroup, Morgan Stanley, Meta, EY, Hexaware, Charles Schwab, Google, Bayer.`;
  }
  if (lower.includes('ats') || lower.includes('vms') || lower.includes('tools') || lower.includes('portal') || lower.includes('platform') || lower.includes('dice') || lower.includes('monster') || lower.includes('careerbuilder') || lower.includes('indeed')) {
    return `I have used ATS/VMS tools including Bullhorn, JobDiva, Ceipal, Fieldglass, Beeline, TalentOrb, and Orwin. I have also used job portals like Dice, Monster, CareerBuilder, Indeed, and LinkedIn Recruiter.`;
  }
  if (lower.includes('skill') || lower.includes('strength') || lower.includes('strongest')) {
    return `My key skills include: End-to-end recruitment, Boolean Search, X-Ray Search, LinkedIn Recruiter, Bullhorn, JobDiva, Ceipal, Fieldglass, account management, stakeholder management, client handling, global IT hiring, and team leadership.`;
  }
  if (lower.includes('soc analyst') || (lower.includes('soc') && !lower.includes('soccer'))) {
    return `Yes, I have experience hiring for SOC Analyst and cybersecurity-related roles. In my current role at Softenger, I handle Cybersecurity and IT Infrastructure hiring, including SOC, NOC, VAPT, Backup & Storage, DBA, Cloud, Network, and Security Engineering roles. I have also recruited Cybersecurity Professionals and Network Security profiles across my US IT recruitment experience.`;
  }
  if (lower.includes('cybersecurity') || lower.includes('vapt') || lower.includes('vapt profiles') || lower.includes('sicherheit') || lower.includes('siem')) {
    return `Yes, I have experience hiring for SOC Analyst and cybersecurity-related roles. In my current role at Softenger, I handle Cybersecurity and IT Infrastructure hiring, including SOC, NOC, VAPT, Backup & Storage, DBA, Cloud, Network, and Security Engineering roles.`;
  }
  if (lower.includes('it infrastructure') || lower.includes('infrastructure roles') || lower.includes('network security')) {
    return `Yes, I have worked on IT Infrastructure hiring including Backup & Storage, DBA, Cloud, Network, Security Engineering, and Network Security profiles.`;
  }
  if (lower.includes('cloud hiring') || lower.includes('cloud')) {
    return `Yes, I have handled Cloud hiring as part of Cybersecurity and IT Infrastructure roles.`;
  }
  if (lower.includes('roles is he working') || lower.includes('working on currently') || (lower.includes('what') && lower.includes('working'))) {
    return `I am currently handling Cybersecurity and IT Infrastructure hiring including SOC, NOC, VAPT, Backup & Storage, DBA, Cloud, Network, and Security Engineering roles.`;
  }
  if (lower.includes('domains') || lower.includes('hired for') || lower.includes('hiring domain') || lower.includes('recruitment domain')) {
    return `I have hired for domains including Cybersecurity (SOC, NOC, VAPT), IT Infrastructure (Backup, Storage, DBA, Cloud, Network, Security), and Development (Java, .NET, Python, React, Node.js).`;
  }
  if (lower.includes('education') || lower.includes('degree') || lower.includes('college') || lower.includes('qualification') || lower.includes('university')) {
    return `I hold a ${knowledgeBase.education[0].degree} from ${knowledgeBase.education[0].institution} (${knowledgeBase.education[0].duration}), and a ${knowledgeBase.education[1].degree} from ${knowledgeBase.education[1].institution}.`;
  }
  if (lower.includes('certification')) {
    return `My certifications include: ${knowledgeBase.certifications.join(', ')}.`;
  }
  if (lower.includes('achievement') || lower.includes('why hire') || lower.includes('why should')) {
    return `I have managed and led a team of 15 recruiters at Softenger. I drive end-to-end recruitment delivery across US, Europe, Middle East, Singapore, and Malaysia. I handle Cybersecurity and IT Infrastructure hiring. I maintain a 500+ candidate pipeline. My strength is combining recruitment expertise with stakeholder management and account handling.`;
  }
  if (lower.includes('global hiring') || lower.includes('countries') || lower.includes('regions recruited') || (lower.includes('us') && lower.includes('recruitment')) || (lower.includes('us') && lower.includes('it'))) {
    return `Yes, I have handled global IT hiring across the US, Europe, Middle East, Singapore, and Malaysia.`;
  }
  if (lower.includes('stakeholder') || lower.includes('manage stakeholders')) {
    return `Yes, I have handled stakeholder management across all my roles, including managing client relationships, coordinating with hiring managers, and aligning recruitment strategies with business goals.`;
  }
  if (lower.includes('account') || lower.includes('account management')) {
    return `Yes, I have handled account management with clients like HPE, Kyndryl, Cadence, Teradyne, Credence, Atkins, Oracle, Amdocs, Tanla Platforms, Caterpillar, Cox Automotive, Bank of America, Wells Fargo, Citigroup, Morgan Stanley, Meta, EY, Hexaware, Charles Schwab, Google, Bayer.`;
  }
  if (lower.includes('managed a team') || (lower.includes('team') && !lower.includes('dream'))) {
    return `Yes, I currently manage a team of 15 recruiters at Softenger, leading their recruitment delivery and training.`;
  }
  
  return null;
}

async function getOpenRouterResponse(message: string): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    return `This is general knowledge, not specific information from Shashank's resume/profile.`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const SYSTEM_PROMPT = `You are Shashank Dwivedi's AI assistant. Use only the knowledge provided about Shashank's professional experience. Do not repeat previous conversation history. Do not mention what was asked before. Give direct, concise answers about Shashank's recruitment experience, skills, and background. For general knowledge questions, answer normally but do not claim it is from his resume.`;
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://shashankportfolio.com',
        'X-Title': 'Shashank Portfolio Chatbot'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: message }
        ],
        max_tokens: 300,
        temperature: 0.7
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return `This is general knowledge, not specific information from Shashank's resume/profile.`;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || `This is general knowledge, not specific information from Shashank's resume/profile.`;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw { status: 504, message: 'Request timeout' };
    }
    return `This is general knowledge, not specific information from Shashank's resume/profile.`;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = (req.body || {}) as { message?: string; history?: { role: 'user' | 'assistant'; content: string }[] };

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: 'Message too long' });
  }

  const kbAnswer = getKnowledgeAnswer(message);
  if (kbAnswer) {
    return res.status(200).json({ answer: kbAnswer });
  }

  try {
    const aiAnswer = await getOpenRouterResponse(message);
    return res.status(200).json({ 
      answer: `${aiAnswer} This is general knowledge, not specific information from Shashank's resume/profile.` 
    });
  } catch (error) {
    const errorObj = error as { status?: number; message?: string };
    if (errorObj.status === 504) {
      return res.status(504).json({ error: 'Request timeout' });
    }
    return res.status(500).json({ error: 'Unable to get response' });
  }
}