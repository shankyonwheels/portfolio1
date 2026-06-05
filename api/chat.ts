import type { VercelRequest, VercelResponse } from '@vercel/node';

// ══════════════════════════════════════════════════════════════════════
// SHASHANK'S PROFILE — FULLY INLINED (no external imports)
// ══════════════════════════════════════════════════════════════════════
const P = {
  name: 'Shashank Dwivedi',
  role: 'Account Manager / Lead IT Recruiter',
  company: 'Softenger',
  experience: '6+',
  location: 'Pune, Maharashtra, India',
  email: 'sdwivedi353@gmail.com',
  phone: '+91 8999154989',
  linkedin: 'https://www.linkedin.com/in/shashank-sam-dwivedi-a4bb09b4/',
  currentCTC: '11 LPA',
  expectedCTC: '16 LPA',
  noticePeriod: '2 Months',
  joiningAvailability: 'As soon as possible after notice period',
  preferredLocation: 'Pune',
  workMode: 'Remote / Hybrid / Open to discuss',
  relocation: 'Open to relocation',
  teamSize: '15 recruiters',
  clients: 'HPE, Kyndryl, Cadence, Teradyne, Credence, Atkins, Oracle, Amdocs, Tanla Platforms, Caterpillar, Cox Automotive, Bank of America, Wells Fargo, Citigroup, Morgan Stanley, Meta, EY, Hexaware, Charles Schwab, Google, Bayer',
  domains: 'Cybersecurity (SOC, NOC, VAPT), IT Infrastructure (Backup & Storage, DBA, Cloud, Network, Security Engineering)',
  rolesHired: 'SOC Analyst, NOC Engineer, VAPT, Cloud Engineer, System Engineer, DevOps, Data Engineer, BI Developer, Python/Java/.NET/React Developer, QA Automation, Scrum Master, Business Analyst, Project Manager, IAM/SailPoint Consultant',
  tools: 'Bullhorn, JobDiva, Ceipal, Fieldglass, Beeline, TalentOrb, Orwin, Dice, Monster, CareerBuilder, LinkedIn Recruiter, Textkernel, Boolean Search, X-Ray Search',
  education: "MCA, Pune University (2021–2023); BCA, ISB&M (2017–2021)",
  certifications: 'Cyber Security Associate (Reliance Foundation), Cybersecurity Certificate (Skill India), Lean Six Sigma Green & Yellow Belt, PMP Training (Simplilearn), ChatGPT for Cybersecurity, Talent Acquisition Certification',
  career: `
1. Account Manager / Lead IT Recruiter — Softenger (Mar 2025–Present)
   Managing 15 recruiters. US, Europe, Middle East, Singapore, Malaysia hiring.
   Clients: HPE, Kyndryl, Cadence, Oracle, Amdocs, Tanla Platforms.
   Focus: Cybersecurity & IT Infrastructure. ₹6 Cr quarterly target.

2. Operation Manager / Lead IT Recruiter — GP Aarogya Healthcare Technologies (Oct 2024–Jan 2025)
   Managed operations for 58 professionals. Built recruitment workflows.

3. Lead US IT Recruiter — Prestige Staffing / Qualified Recruiter (May 2023–Sep 2024)
   500+ candidate pipeline. Top performer 3+ years.
   Clients: Caterpillar, Cox Automotive.

4. Lead US IT Recruiter — IMS / Experis (May 2022–May 2023)
   Clients: Bank of America, Wells Fargo. Tools: Fieldglass, Bullhorn.

5. Sr. US IT Recruiter — Mindlance (Jan 2022–May 2022)
   Clients: Citigroup, Morgan Stanley across 12 locations.

6. US IT Recruiter — Head Field Solution Pvt Ltd (Jul 2020–Jan 2022)
   C2C, W2, Contract-to-Hire. Clients: Meta, EY, Hexaware, Charles Schwab, Google, Bayer.
`,
  strengths: 'End-to-end recruitment, Boolean & X-Ray Search, LinkedIn Recruiter, Account Management, Stakeholder Management, Vendor Management, Global IT Hiring, Team Leadership, Salary Negotiation, Offer Coordination, Cybersecurity Domain Expertise',
};

// ══════════════════════════════════════════════════════════════════════
// MODEL CONFIGURATION — via Vercel env vars with smart defaults
// ══════════════════════════════════════════════════════════════════════
const KEY = process.env.OPENROUTER_API_KEY;

// Model roles — all overridable via Vercel environment variables
const MODELS = {
  // Fast: low latency — for profile/screening questions
  fast: process.env.OPENROUTER_MODEL_FAST || 'nvidia/nemotron-3-super-120b-a12b:free',
  // Advanced: deep reasoning — for career analysis, JD matching, writing
  advanced: process.env.OPENROUTER_MODEL_ADVANCED || 'nvidia/nemotron-3-super-120b-a12b:free',
  // General: broad knowledge — for non-profile questions
  general: process.env.OPENROUTER_MODEL_GENERAL || 'openai/gpt-oss-20b:free',
  // Fallback: emergency backup when primary fails
  fallback: process.env.OPENROUTER_MODEL_FALLBACK || 'nvidia/nemotron-3-super-120b-a12b:free',
};

// Verified working free chat models on OpenRouter (tested June 2025).
// Update via env vars or re-verify at https://openrouter.ai/models?q=free
// Order = priority for fallback attempts within the 3-attempt limit.
const FREE_MODEL_POOL: string[] = [
  'nvidia/nemotron-3-super-120b-a12b:free',  // ✅ verified 737ms (FAST + CAPABLE)
  'openai/gpt-oss-20b:free',                  // ✅ verified 2.6s (GOOD GENERAL)
  'nvidia/nemotron-3-ultra-550b-a55b:free',   // listed as available — ultra large
  'poolside/laguna-m.1:free',                  // listed as available
  'poolside/laguna-xs.2:free',                 // listed as available — small/fast
  'z-ai/glm-4.5-air:free',                    // listed as available
  'qwen/qwen3-coder:free',                    // listed — large context
  'liquid/lfm-2.5-1.2b-instruct:free',       // listed — small, fast
  'cognitivecomputations/dolphin-mistral-24b-venice-edition:free', // listed
].filter((v, i, a) => v && a.indexOf(v) === i);

// Timeout: 8000ms to stay safely under Vercel Hobby 10s function limit
const API_TIMEOUT = 8000;
const MAX_MSG_LENGTH = 800;

// ══════════════════════════════════════════════════════════════════════
// INTENT DETECTION
// ══════════════════════════════════════════════════════════════════════
type Intent = 'PROFILE' | 'CAREER' | 'JD' | 'WRITING' | 'GENERAL' | 'MIXED';

function detectIntent(message: string): Intent {
  const q = message.toLowerCase();

  // JD analysis — user pasted a job description or asks about fit
  if (q.includes('job description') || q.includes(' jd ') || q.includes('job desc') ||
      q.includes('am i fit') || q.includes('do i qualify') || q.includes('match this') ||
      q.includes('requirements:') || q.includes('responsibilities:') || q.includes('qualifications:')) {
    return 'JD';
  }

  // Writing intent — user wants drafts, emails, messages
  if (q.includes('write ') || q.includes('draft ') || q.includes('compose ') ||
      q.includes('email to') || q.includes('message to') || q.includes('inmail') ||
      q.includes('cover letter') || q.includes('summarize my') || q.includes('template')) {
    return 'WRITING';
  }

  // Profile screening — direct recruiter screening questions
  const profileKeywords = [
    'ctc', 'salary', 'package', 'notice period', 'notice', 'join', 'joining',
    'current role', 'present role', 'current company', 'currently working',
    'location', 'relocat', 'remote', 'hybrid', 'onsite', 'wfh',
    'experience', 'years of', 'total exp', 'qualification', 'education',
    'client', 'worked with', 'portfolio', 'certif', 'tools', 'ats', 'vms',
    'domain', 'roles hired', 'hiring domain', 'contact', 'email', 'phone',
    'yourself', 'about shashank', 'profile', 'background', 'resume', 'cv',
    'skills', 'strength', 'availability', 'available', 'open to',
  ];
  if (profileKeywords.some(k => q.includes(k))) {
    // If also has analysis/career context, treat as mixed/career
    if (q.includes('career') || q.includes('growth') || q.includes('why hire') ||
        q.includes('achieve') || q.includes('leadership') || q.includes('goal')) {
      return 'CAREER';
    }
    return 'PROFILE';
  }

  // Career analysis — strategic, growth, achievement questions
  const careerKeywords = [
    'career', 'growth', 'achieve', 'accomplish', 'leadership', 'manage team',
    'why hire', 'why should', 'best candidate', 'stand out', 'contribution',
    'what next', 'shashank learn', 'future plan', 'roadmap', 'goal',
    'stakeholder', 'account manag', 'vendor', 'global hiring', 'cybersecurity career',
    'ai in recruitment', 'ai for shashank', 'how can shashank',
  ];
  if (careerKeywords.some(k => q.includes(k))) return 'CAREER';

  // Mixed — general topic but with Shashank relevance
  const mixedKeywords = [
    'shashank', 'for recruitment', 'for recruiter', 'best for hiring',
    'for sourcing', 'for talent', 'for shashank',
  ];
  if (mixedKeywords.some(k => q.includes(k))) return 'MIXED';

  // Default — general knowledge question
  return 'GENERAL';
}

// ══════════════════════════════════════════════════════════════════════
// LOCAL KNOWLEDGE LOOKUP — instant answers for common recruiter questions
// ══════════════════════════════════════════════════════════════════════
function getLocalAnswer(message: string): string | null {
  const q = message.toLowerCase().replace(/[?!.,']+/g, '').replace(/\s+/g, ' ').trim();

  if ((q.includes('current ctc') || (q.includes('ctc') && !q.includes('expect'))) ||
      (q.includes('salary') && !q.includes('expect') && !q.includes('general')))
    return `My current CTC is ${P.currentCTC}.`;

  if (q.includes('expected ctc') || q.includes('expected salary') || q.includes('expected package') ||
      (q.includes('expect') && (q.includes('ctc') || q.includes('salary') || q.includes('package'))))
    return `My expected CTC is ${P.expectedCTC}.`;

  if (q.includes('notice period') || q.includes('notice'))
    return `My notice period is ${P.noticePeriod}.`;

  if (q.includes('join') || q.includes('joining') || q.includes('when can') || q.includes('available from'))
    return `I can join ${P.joiningAvailability}. My notice period is ${P.noticePeriod}.`;

  if (q.includes('remote') || q.includes('hybrid') || q.includes('work mode') || q.includes('wfh') || q.includes('work from home') || q.includes('onsite'))
    return `I am open to ${P.workMode}. I am also ${P.relocation}.`;

  if ((q.includes('location') && !q.includes('global')) || q.includes('relocat') || q.includes('based'))
    return `I am based in ${P.location}. Preferred: ${P.preferredLocation}. ${P.relocation}.`;

  if (q.includes('current role') || q.includes('present role') || q.includes('currently working') || q.includes('working as') || (q.includes('what') && q.includes('role') && !q.includes('hired')))
    return `I am currently working as ${P.role} at ${P.company}. I lead a team of ${P.teamSize} and handle Cybersecurity & IT Infrastructure hiring across US, Europe, Middle East, Singapore, and Malaysia.`;

  if (q.includes('total experience') || (q.includes('experience') && (q.includes('how many') || q.includes('years') || q.includes('total'))))
    return `I have ${P.experience} years of experience in US IT recruitment and global hiring across Cybersecurity, IT Infrastructure, and Staffing. I've worked with top Fortune 500 companies across 5 regions.`;

  if (q.includes('about yourself') || q.includes('about shashank') || q.includes('who are you') || q.includes('introduce') || q.includes('tell me about you'))
    return `I am ${P.name}, a ${P.role} based in ${P.location}. With ${P.experience} years in IT recruitment, I currently lead ${P.teamSize} at ${P.company}, handling Cybersecurity & IT Infrastructure hiring globally across US, Europe, Middle East, Singapore, and Malaysia.`;

  if (q.includes('client') || (q.includes('worked with') && !q.includes('company')))
    return `I have worked with: ${P.clients}.`;

  if (q.includes('ats') || q.includes('vms') || q.includes('tools') || q.includes('portal') || q.includes('platform') || q.includes('software') || q.includes('bullhorn') || q.includes('jobdiva'))
    return `Tools & Portals I use: ${P.tools}.`;

  if (q.includes('cybersecurity') || q.includes('cyber') || q.includes('soc') || q.includes('noc') || q.includes('vapt') || q.includes('security'))
    return `Yes, Cybersecurity hiring is my core specialization. I currently handle SOC, NOC, VAPT, Cloud, Network, and Security Engineering roles at Softenger. I have 3+ years of dedicated Cybersecurity hiring experience.`;

  if (q.includes('domain') || q.includes('speciali') || q.includes('hiring domain'))
    return `My key hiring domains: ${P.domains}. I also recruit developers, data engineers, project managers, and IAM consultants.`;

  if (q.includes('skills') || q.includes('strength') || q.includes('good at') || q.includes('expertise'))
    return `Core strengths: ${P.strengths}.`;

  if (q.includes('education') || q.includes('degree') || q.includes('college') || q.includes('qualification') || q.includes('mca') || q.includes('bca'))
    return `Education: ${P.education}.`;

  if (q.includes('certif') || q.includes('course') || q.includes('training'))
    return `Certifications: ${P.certifications}.`;

  if (q.includes('team') || q.includes('manage') || q.includes('leadership'))
    return `I currently lead a team of ${P.teamSize} at ${P.company}. I coach them on Boolean search, sourcing, client handling, and closing. Responsible for ₹6 Cr quarterly target.`;

  if (q.includes('why hire') || q.includes('why should') || q.includes('best candidate') || q.includes('stand out'))
    return `Why Shashank? ${P.experience} years across US IT, global hiring (5 regions), Cybersecurity specialization, leadership of 15 recruiters, 500+ candidate pipelines, and Fortune 500 account management. He combines recruitment execution with strategic stakeholder and vendor management.`;

  if (q.includes('contact') || q.includes('email') || q.includes('phone') || q.includes('linkedin'))
    return `Contact: Email: ${P.email} | Phone: ${P.phone} | LinkedIn: ${P.linkedin}`;

  if (q.includes('company') || q.includes('employer') || q.includes('where') && q.includes('work'))
    return `Career: Softenger (current) → GP Aarogya → Prestige Staffing → IMS/Experis → Mindlance → Head Field Solution.`;

  if (q.includes('global') || q.includes('international') || q.includes('us hiring') || q.includes('us it') || q.includes('europe') || q.includes('middle east'))
    return `Yes, I have managed global IT recruitment across US, Europe, Middle East, Singapore, and Malaysia.`;

  if (q.includes('experience') || q.includes('background') || q.includes('career history'))
    return `Career Summary:${P.career}\nTotal: ${P.experience} years.`;

  return null;
}

// ══════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT BUILDER — tailored per intent
// ══════════════════════════════════════════════════════════════════════
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildSystemPrompt(intent: Intent, _message: string): string {
  const profile = `
NAME: ${P.name}
ROLE: ${P.role} at ${P.company}
EXPERIENCE: ${P.experience} years
CURRENT CTC: ${P.currentCTC} | EXPECTED CTC: ${P.expectedCTC}
NOTICE PERIOD: ${P.noticePeriod} | JOINING: ${P.joiningAvailability}
LOCATION: ${P.location} | WORK MODE: ${P.workMode} | ${P.relocation}
CLIENTS: ${P.clients}
DOMAINS: ${P.domains}
TOOLS: ${P.tools}
STRENGTHS: ${P.strengths}
CERTIFICATIONS: ${P.certifications}
EDUCATION: ${P.education}
CAREER: ${P.career}`.trim();

  const baseStyle = `
RESPONSE STYLE:
- Be human, warm, professional, and confident — not robotic
- Use short paragraphs
- Avoid "as previously asked", "as I mentioned", "based on the information provided"
- No unnecessary disclaimers
- Get to the point quickly
- For voice: keep answers conversational and under 3 sentences when possible`.trim();

  switch (intent) {
    case 'PROFILE':
      return `You are Shashank Dwivedi's AI Screening Assistant. Answer recruiter questions factually and concisely using only the profile data below. Sound confident and professional.

${profile}

${baseStyle}
If a detail is missing, say: "That's not currently listed — please contact Shashank directly at ${P.email}."`;

    case 'CAREER':
      return `You are Shashank Dwivedi's career advocate and AI assistant. Give strategic, thoughtful answers that highlight his strengths, achievements, leadership, and career trajectory.

${profile}

${baseStyle}
Sound like a confident professional representing Shashank to a senior recruiter or hiring manager. Be specific about achievements, not generic.`;

    case 'JD':
      return `You are Shashank Dwivedi's career coach performing a JD-fit analysis. Analyze how Shashank's profile matches the provided job description. Be honest, highlight strong matches, and address gaps tactfully.

${profile}

${baseStyle}
Structure: 1) Matching skills/experience, 2) Key strengths for this role, 3) Any gaps + how Shashank addresses them. Be recruiter-friendly and maximize screen-selection chances.`;

    case 'WRITING':
      return `You are a professional career writing assistant helping Shashank Dwivedi. Write polished, human-sounding professional content.

${profile}

${baseStyle}
Writing style: professional, crisp, warm, and natural. No corporate jargon. Sound like a real person wrote it, not a template.`;

    case 'MIXED':
      return `You are an intelligent AI assistant on Shashank Dwivedi's portfolio. Answer the question thoughtfully. If it relates to recruitment, hiring, or career, connect it to Shashank's experience where relevant.

SHASHANK'S QUICK BIO: ${P.experience} years in IT recruitment, ${P.role} at ${P.company}, specializing in Cybersecurity & IT Infrastructure hiring globally. Clients include Fortune 500 companies.

${baseStyle}`;

    case 'GENERAL':
    default:
      return `You are an intelligent AI assistant on a portfolio website. Answer all questions helpfully and accurately.

IMPORTANT RULE: If the question is NOT about Shashank's career, resume, or recruitment:
- Start with: "Not directly related to Shashank's profile, but here's the answer:"
- Then give a complete, accurate, helpful answer.
- End with a brief relevant connection to Shashank's work ONLY if it naturally fits.

If the question IS about recruitment, AI, technology, or careers, you may optionally relate it to Shashank's expertise naturally.

${baseStyle}
Answer like a smart, helpful human — concise, accurate, and genuinely useful.`;
  }
}

// ══════════════════════════════════════════════════════════════════════
// SUGGESTED QUESTIONS — intent-aware, avoid repetition
// ══════════════════════════════════════════════════════════════════════
const SUGGESTION_POOLS: Record<Intent, string[]> = {
  PROFILE: [
    'What is your current CTC?', 'What is your expected CTC?',
    'What is your notice period?', 'When can you join?',
    'Are you open to remote work?', 'Are you open to relocation?',
    'What is your preferred work location?', 'Which clients have you worked with?',
    'What tools and ATS do you use?', 'What is your highest qualification?',
    'Have you hired SOC Analysts?', 'What domains do you specialize in?',
    'What is your current company?', 'Are you open to hybrid work?',
  ],
  CAREER: [
    'What makes you the best candidate for this role?', 'Tell me about your leadership experience.',
    'What are your biggest career achievements?', 'How have you contributed to business growth?',
    'What is your experience with global hiring?', 'How do you handle high-volume recruitment?',
    'What certifications do you have?', 'How do you manage stakeholders?',
    'What is your experience with account management?', 'How have you grown your recruitment team?',
    'What is your biggest achievement at Softenger?', 'Why are you the right fit for a lead role?',
  ],
  JD: [
    'How does your profile match this JD?', 'What relevant experience do you have for this role?',
    'Can you handle the responsibilities listed?', 'What tools experience do you have for this JD?',
    'How quickly can you get up to speed?', 'What gaps do you see in your profile vs this JD?',
    'Have you worked in this domain before?', 'Can you share examples of similar work?',
  ],
  GENERAL: [
    'How can AI help in IT recruitment?', 'What are the latest trends in talent acquisition?',
    'Which laptop is best for recruitment work?', 'How can Shashank use AI for better sourcing?',
    'What is cybersecurity hiring?', 'Tell me about Boolean search in recruitment.',
    'What is the difference between C2C, W2, and 1099?', 'How does ATS software work?',
    'What is talent mapping?', 'Explain the recruitment lifecycle.',
    'What is VMS in staffing?', 'How do you source passive candidates?',
  ],
  WRITING: [
    'Can you write a follow-up email for a candidate?', 'Draft a recruiter InMail for LinkedIn.',
    'Write a candidate screening summary.', 'Create a job description template.',
    'Write a client submission email.', 'Draft a thank you email after interview.',
    'Write a candidate rejection email.', 'Compose a job offer acceptance email.',
  ],
  MIXED: [
    'What is Shashank\'s current role?', 'How can AI improve Shashank\'s recruitment?',
    'What certifications does Shashank have?', 'Tell me about Shashank\'s global hiring experience.',
    'What domains does Shashank specialize in?', 'What is Shashank\'s notice period?',
    'Which clients has Shashank worked with?', 'Why should we hire Shashank?',
  ],
};

function getSuggestions(intent: Intent, usedQuestions: string[]): string[] {
  // Get candidates from current intent pool
  const pool = [...SUGGESTION_POOLS[intent]];

  // Add a few from other relevant pools for variety
  const extra = intent === 'GENERAL'
    ? SUGGESTION_POOLS.MIXED.slice(0, 3)
    : SUGGESTION_POOLS.GENERAL.slice(0, 2);

  const allCandidates = [...pool, ...extra];
  const usedSet = new Set(usedQuestions);

  // Filter out used, shuffle, take 4
  const available = allCandidates.filter(q => !usedSet.has(q));
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  return available.slice(0, 4);
}

// ══════════════════════════════════════════════════════════════════════
// SPEAKABLE VERSION — clean text for TTS (no markdown, concise)
// ══════════════════════════════════════════════════════════════════════
function makeSpeakable(text: string, intent: Intent): string {
  // Remove markdown formatting
  let clean = text
    .replace(/\*\*(.+?)\*\*/g, '$1')   // **bold** → bold
    .replace(/\*(.+?)\*/g, '$1')        // *italic* → italic
    .replace(/#{1,6}\s/g, '')           // ## headers
    .replace(/`(.+?)`/g, '$1')          // `code`
    .replace(/\|[^|]+\|/g, '')          // | table |
    .replace(/[-*]\s+/g, '')            // bullet points
    .replace(/\n{2,}/g, ' ')            // multiple newlines → space
    .replace(/\n/g, ' ')                // single newlines
    .replace(/\s{2,}/g, ' ')            // multiple spaces
    .trim();

  // For general questions — first 2 sentences only (keep voice concise)
  if (intent === 'GENERAL') {
    const sentences = clean.split(/(?<=[.!?])\s+/);
    if (sentences.length > 3) {
      clean = sentences.slice(0, 3).join(' ');
    }
  }

  // Hard cap at 300 chars for voice
  if (clean.length > 300) {
    const cutoff = clean.lastIndexOf(' ', 290);
    clean = clean.substring(0, cutoff > 200 ? cutoff : 290) + '.';
  }

  return clean;
}

// ══════════════════════════════════════════════════════════════════════
// SINGLE MODEL CALL
// ══════════════════════════════════════════════════════════════════════
async function callModel(
  systemPrompt: string,
  userMessage: string,
  model: string,
  timeoutMs = API_TIMEOUT
): Promise<string> {
  if (!KEY) throw new Error('NO_KEY');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://shashankdwivedi.vercel.app',
        'X-Title': 'Shashank Portfolio AI',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 400,
        temperature: 0.5,
      }),
    });

    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP_${res.status}`);

    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content || '';
    if (!content || content.length < 3) throw new Error('EMPTY_RESPONSE');
    return content.trim();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ══════════════════════════════════════════════════════════════════════
// MULTI-MODEL FALLBACK — intent-aware timeouts to stay under Vercel 10s limit
// ══════════════════════════════════════════════════════════════════════
async function callModelWithFallback(
  systemPrompt: string,
  userMessage: string,
  primaryModel: string,
  intent: Intent
): Promise<{ text: string; modelUsed: string }> {
  // Intent-aware strategy to safely fit within Vercel Hobby 10s limit:
  // GENERAL  → 1 attempt × 7s  = 7s max  (single fast shot)
  // MIXED    → 2 attempts × 4s  = 8s max
  // CAREER/JD/WRITING → 2 attempts × 4s = 8s max
  const isGeneral = intent === 'GENERAL';
  const MAX_ATTEMPTS = isGeneral ? 1 : 2;
  const PROBE_TIMEOUT = isGeneral ? 7000 : 4000;

  const allModels = [primaryModel, ...FREE_MODEL_POOL.filter(m => m !== primaryModel)];
  const trials = allModels.slice(0, MAX_ATTEMPTS);

  for (const model of trials) {
    try {
      const text = await callModel(systemPrompt, userMessage, model, PROBE_TIMEOUT);
      return { text, modelUsed: model };
    } catch {
      continue;
    }
  }

  // All attempts failed — friendly fallback, never crashes
  return {
    text: isGeneral
      ? "I couldn't reach the AI model right now. For Shashank's profile, experience, CTC, or skills — just ask and I'll answer instantly!"
      : "I'm having a brief connection issue. Please try again in a moment.",
    modelUsed: 'local_fallback',
  };
}

// ══════════════════════════════════════════════════════════════════════
// SELECT PRIMARY MODEL BY INTENT
// ══════════════════════════════════════════════════════════════════════
function selectModel(intent: Intent): string {
  switch (intent) {
    case 'PROFILE': return MODELS.fast;
    case 'CAREER': return MODELS.advanced;
    case 'JD': return MODELS.advanced;
    case 'WRITING': return MODELS.advanced;
    case 'MIXED': return MODELS.general;
    case 'GENERAL': return MODELS.general;
    default: return MODELS.fast;
  }
}

// ══════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ══════════════════════════════════════════════════════════════════════
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS — always first
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};
    const message: string = typeof body.message === 'string' ? body.message.trim() : '';
    const usedQuestions: string[] = Array.isArray(body.usedQuestions) ? body.usedQuestions : [];

    if (!message) return res.status(400).json({ error: 'Message is required' });
    if (message.length > MAX_MSG_LENGTH) return res.status(400).json({ error: 'Message too long' });

    const intent = detectIntent(message);
    const suggestions = getSuggestions(intent, usedQuestions);

    // ── 1. Try local knowledge base first (instant, zero network) ──
    const localAnswer = getLocalAnswer(message);
    if (localAnswer) {
      return res.status(200).json({
        answer: localAnswer,
        speakable: makeSpeakable(localAnswer, intent),
        intent,
        suggestions,
        source: 'knowledge_base',
      });
    }

    // ── 2. Try AI with multi-model fallback ──
    const primaryModel = selectModel(intent);
    const systemPrompt = buildSystemPrompt(intent, message);

    // For GENERAL intent, also pass a note about the question type
    const userPrompt = intent === 'GENERAL'
      ? `Question from website visitor: ${message}`
      : message;

    const { text: aiAnswer, modelUsed } = await callModelWithFallback(systemPrompt, userPrompt, primaryModel, intent);

    // Clean up any "As previously asked" or history artifacts
    const cleanAnswer = aiAnswer
      .replace(/\b(as (previously|earlier|before) (asked|mentioned|discussed|stated))[,:]?\s*/gi, '')
      .replace(/\b(as I (mentioned|said|explained) (before|earlier|previously))[,:]?\s*/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    return res.status(200).json({
      answer: cleanAnswer,
      speakable: makeSpeakable(cleanAnswer, intent),
      intent,
      suggestions,
      source: 'ai',
      model: modelUsed, // for debugging — not shown to user
    });

  } catch (err) {
    // Final safety net — never return 500 to user
    console.error('[chat] Unhandled error:', err instanceof Error ? err.message : String(err));
    const fallbackText = `I'm ${P.name}, a ${P.role} with ${P.experience} years of IT recruitment experience. Please contact me at ${P.email} for detailed information.`;
    return res.status(200).json({
      answer: fallbackText,
      speakable: fallbackText,
      intent: 'PROFILE',
      suggestions: SUGGESTION_POOLS.PROFILE.slice(0, 4),
      source: 'fallback',
    });
  }
}