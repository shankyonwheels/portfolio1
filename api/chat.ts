import type { VercelRequest, VercelResponse } from '@vercel/node';

// ─── INLINE KNOWLEDGE BASE (no external import — fixes ERR_MODULE_NOT_FOUND on Vercel) ───
const CURRENT_CTC = '11 LPA';
const EXPECTED_CTC = '16 LPA';
const NOTICE_PERIOD = '2 Months';
const PREFERRED_LOCATION = 'Pune';
const WORK_MODE = 'Remote / Hybrid / Open to discuss';
const RELOCATION = 'Open to relocation';
const JOIN_AVAILABILITY = 'As soon as possible';
const CURRENT_ROLE = 'Account Manager / Lead IT Recruiter';
const CURRENT_COMPANY = 'Softenger';
const EXPERIENCE_YEARS = '6+';
const NAME = 'Shashank Dwivedi';
const EMAIL = 'sdwivedi353@gmail.com';
const PHONE = '+91 8999154989';
const LINKEDIN = 'https://www.linkedin.com/in/shashank-sam-dwivedi-a4bb09b4/';
const LOCATION = 'Pune, Maharashtra, India';

const CLIENTS = 'HPE, Kyndryl, Cadence, Teradyne, Credence, Atkins, Oracle, Amdocs, Tanla Platforms, Caterpillar, Cox Automotive, Bank of America, Wells Fargo, Citigroup, Morgan Stanley, Meta, EY, Hexaware, Charles Schwab, Google, Bayer';
const ATS_TOOLS = 'Bullhorn, JobDiva, Ceipal, Fieldglass, Beeline, TalentOrb, Orwin';
const JOB_PORTALS = 'Dice, Monster, CareerBuilder, Indeed, LinkedIn Recruiter, Textkernel';
const DOMAINS = 'Cybersecurity (SOC, NOC, VAPT), IT Infrastructure (Backup & Storage, DBA, Cloud, Network, Security Engineering)';
const ROLES_HIRED = 'SOC Analyst, NOC, VAPT, Cloud Engineer, System Engineer, DevOps, Data Engineer, BI Developer, ETL Developer, AI/ML Developer, Python Developer, Java Developer, .NET Developer, React/Node.js Developer, QA Automation, Scrum Master, Business Analyst, Project Manager, IT Director, IAM Consultant, SailPoint';
const CERTIFICATIONS = 'Cyber Security Associate (Reliance Foundation, Mar 2026), Cybersecurity Certificate (Skill India Digital Hub, Mar 2026), Talent Acquisition Certification (LearnTube.ai, Sep 2025), Lean Six Sigma Green Belt (Alison, Jun 2025), Lean Six Sigma Yellow Belt (CSSC, Jun 2025), ChatGPT for Cybersecurity (Simplilearn, May 2025), Master in POSH Act 2013 (Keka Academy, May 2025), PMP Certification Training (Simplilearn, Mar 2025)';
const EDUCATION = "Master's in Computer Application, Pune University (2021–2023); Bachelor's in Computer Application, International School of Business and Media (2017–2021)";

const EXPERIENCE_HISTORY = `
1. Account Manager / Lead IT Recruiter — Softenger (Mar 2025–Present): Managing 15 recruiters, end-to-end recruitment across US, Europe, Middle East, Singapore, Malaysia. Clients: HPE, Kyndryl, Cadence, Oracle, Amdocs. Cybersecurity & IT Infrastructure hiring.
2. Operation Manager / Lead IT Recruiter — GP Aarogya Healthcare Technologies (Oct 2024–Jan 2025): Managed operations for 58 professionals, built recruitment workflows.
3. Lead US IT Recruiter — Qualified Recruiter / Prestige Staffing (May 2023–Sep 2024): 500+ candidate pipeline, top performer 3+ years. Clients: Caterpillar, Cox Automotive.
4. Lead US IT Recruiter — IMS / Experis (May 2022–May 2023): Bank of America, Wells Fargo requirements. Fieldglass, Bullhorn.
5. Sr. US IT Recruiter — Mindlance (Jan 2022–May 2022): Citigroup, Morgan Stanley across 12 locations.
6. US IT Recruiter — Head Field Solution Pvt Ltd (Jul 2020–Jan 2022): C2C, W2, Contract-to-Hire. Clients: Meta, EY, Hexaware, Charles Schwab, Google, Bayer.
`;

// ─── CONFIG ───
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
// Use env override if set, otherwise default to nvidia nemotron (fast free tier model)
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'nvidia/nemotron-super-49b-v1:free';
const MAX_MESSAGE_LENGTH = 500;
const API_TIMEOUT = 8000; // 8s hard cap — knowledge base answers bypass this entirely

// ─── NORMALISE ───
function normalizeQuery(q: string): string {
  return q.toLowerCase().replace(/[?!.,']+/g, '').replace(/\s+/g, ' ').trim();
}

// ─── LOCAL KNOWLEDGE LOOKUP (zero network calls, always fast) ───
function getLocalAnswer(message: string): string | null {
  const q = normalizeQuery(message);

  if (q.includes('current ctc') || (q.includes('ctc') && !q.includes('expect')) || (q.includes('salary') && !q.includes('expect')))
    return `My current CTC is ${CURRENT_CTC}.`;

  if (q.includes('expected ctc') || q.includes('expected salary') || (q.includes('expect') && (q.includes('ctc') || q.includes('salary') || q.includes('package'))))
    return `My expected CTC is ${EXPECTED_CTC}.`;

  if (q.includes('notice period') || q.includes('notice') || q.includes('serving notice'))
    return `My notice period is ${NOTICE_PERIOD}.`;

  if (q.includes('join') || q.includes('joining') || q.includes('when can') || q.includes('available from'))
    return `I can join ${JOIN_AVAILABILITY}. My notice period is ${NOTICE_PERIOD}.`;

  if (q.includes('remote') || q.includes('hybrid') || q.includes('work mode') || q.includes('work from home') || q.includes('wfh') || q.includes('onsite'))
    return `I am open to ${WORK_MODE}. I am also ${RELOCATION}.`;

  if ((q.includes('location') && !q.includes('global')) || q.includes('relocat') || q.includes('pune'))
    return `I am based in ${LOCATION}. Preferred location: ${PREFERRED_LOCATION}. ${RELOCATION}.`;

  if (q.includes('current role') || q.includes('present role') || q.includes('currently working') || q.includes('working as') || (q.includes('what') && q.includes('role') && !q.includes('hired')))
    return `I am currently working as ${CURRENT_ROLE} at ${CURRENT_COMPANY}. I manage a team of 15 recruiters and handle Cybersecurity & IT Infrastructure hiring across US, Europe, Middle East, Singapore, and Malaysia.`;

  if (q.includes('total experience') || (q.includes('experience') && (q.includes('how many') || q.includes('years') || q.includes('total'))))
    return `I have ${EXPERIENCE_YEARS} years of experience in US IT recruitment, global IT hiring, staffing, consulting, account management, and stakeholder management. My career spans Softenger, GP Aarogya, Prestige Staffing, IMS/Experis, Mindlance, and Head Field Solution.`;

  if (q.includes('tell me about') || q.includes('about yourself') || q.includes('who are you') || q.includes('about shashank') || q.includes('introduce') || q.includes('summary'))
    return `I am ${NAME}, a ${CURRENT_ROLE} based in ${LOCATION}. I have ${EXPERIENCE_YEARS} years of recruitment experience across US IT, global hiring, staffing, and account management. Currently at ${CURRENT_COMPANY}, I lead a team of 15 recruiters handling Cybersecurity & IT Infrastructure hiring globally.`;

  if (q.includes('client') || (q.includes('worked with') && !q.includes('company')) || q.includes('account') && q.includes('handle'))
    return `I have worked with clients including: ${CLIENTS}.`;

  if (q.includes('account management') || (q.includes('account') && q.includes('manage')))
    return `Yes, I have strong account management experience. I currently own client relationships and account management at Softenger, handling clients like HPE, Kyndryl, Cadence, Oracle, Amdocs, and Tanla Platforms.`;

  if (q.includes('ats') || q.includes('vms') || q.includes('tools') || q.includes('portal') || q.includes('platform') || q.includes('software') || q.includes('bullhorn') || q.includes('jobdiva') || q.includes('dice') || q.includes('monster'))
    return `ATS/VMS Tools: ${ATS_TOOLS}. Job Portals: ${JOB_PORTALS}. I also use LinkedIn Recruiter, Boolean Search, X-Ray Search.`;

  if (q.includes('cybersecurity') || q.includes('cyber') || q.includes('soc') || q.includes('noc') || q.includes('vapt') || q.includes('siem') || q.includes('security'))
    return `Yes, I have strong Cybersecurity hiring experience. At Softenger, I currently handle SOC, NOC, VAPT, DBA, Backup & Storage, Cloud, Network, and Security Engineering roles. I have 3+ years in Cybersecurity hiring across all my roles.`;

  if (q.includes('it infrastructure') || q.includes('infrastructure') || q.includes('network') || q.includes('cloud') || q.includes('devops'))
    return `Yes, I have extensive IT Infrastructure hiring experience including Cloud Engineer, DevOps, System Engineer, System Admin, Network Security, Backup & Storage, DBA, and Security Engineering roles.`;

  if (q.includes('domain') || q.includes('hired for') || q.includes('hiring domain') || q.includes('recruitment domain') || q.includes('specializ'))
    return `My key hiring domains: ${DOMAINS}. I have also recruited developers (Java, .NET, Python, React), Data Engineers, Project Managers, Scrum Masters, QA Engineers, and IAM Consultants.`;

  if (q.includes('roles') && (q.includes('hired') || q.includes('recruit') || q.includes('worked on')))
    return `Roles I have recruited for include: ${ROLES_HIRED}.`;

  if (q.includes('skill') || q.includes('strength') || q.includes('good at') || q.includes('expertise') || q.includes('competenc'))
    return `My core skills: End-to-end recruitment, Boolean & X-Ray Search, LinkedIn Recruiter, ${ATS_TOOLS}, Account Management, Stakeholder Management, Vendor Management, Global IT Hiring, Team Leadership (15 recruiters), Salary Negotiation, Offer Coordination.`;

  if (q.includes('global') || q.includes('international') || q.includes('countries') || q.includes('region') || q.includes('us hiring') || q.includes('us it') || q.includes('europe') || q.includes('middle east') || q.includes('singapore') || q.includes('malaysia'))
    return `Yes, I have handled global IT recruitment across the US, Europe, Middle East, Singapore, and Malaysia.`;

  if (q.includes('team') || q.includes('manage team') || q.includes('managed team') || q.includes('lead') || q.includes('leadership'))
    return `Yes, I currently lead and manage a team of 15 recruiters at Softenger. I coach them on Boolean search, sourcing, client handling, and closure techniques. I am responsible for the ₹6 Cr quarterly recruitment delivery target.`;

  if (q.includes('stakeholder') || q.includes('management') && q.includes('stake'))
    return `Yes, I have extensive stakeholder management experience — coordinating with hiring managers, directors, project managers, and delivery teams across all my roles.`;

  if (q.includes('education') || q.includes('degree') || q.includes('college') || q.includes('qualification') || q.includes('university') || q.includes('mca') || q.includes('bca'))
    return `Education: ${EDUCATION}.`;

  if (q.includes('certification') || q.includes('certif') || q.includes('course') || q.includes('training'))
    return `My certifications: ${CERTIFICATIONS}.`;

  if (q.includes('achievement') || q.includes('why hire') || q.includes('why should') || q.includes('why you') || q.includes('best candidate') || q.includes('stand out'))
    return `Why hire me: I lead a team of 15 recruiters at Softenger with a ₹6 Cr quarterly target. I have ${EXPERIENCE_YEARS} years spanning US IT, global hiring across 5 regions, Cybersecurity specialization, 500+ candidate pipelines, and strong client account management with Fortune 500 companies. I combine recruitment execution with strategic stakeholder and vendor management.`;

  if (q.includes('company') || q.includes('employer') || q.includes('organization') || q.includes('where have you worked'))
    return `I have worked at: Softenger (current), GP Aarogya Healthcare Technologies, Qualified Recruiter / Prestige Staffing, IMS / Experis, Mindlance, Head Field Solution Pvt Ltd.`;

  if (q.includes('contact') || q.includes('email') || q.includes('phone') || q.includes('reach') || q.includes('linkedin'))
    return `Contact Shashank: Email: ${EMAIL} | Phone: ${PHONE} | LinkedIn: ${LINKEDIN}`;

  if (q.includes('experience') || q.includes('background') || q.includes('career') || q.includes('history') || q.includes('profile'))
    return `Here is a summary of my career:\n${EXPERIENCE_HISTORY}\nTotal: ${EXPERIENCE_YEARS} years of recruitment experience.`;

  return null;
}

// ─── OPENROUTER AI FALLBACK ───
async function getAIAnswer(message: string): Promise<string> {
  if (!OPENROUTER_API_KEY) return getGenericFallback(message);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const systemPrompt = `You are Shashank Dwivedi's AI Recruiter Screening Assistant on his portfolio website.
Answer ONLY using the candidate profile below. Be concise, professional, and recruiter-friendly.
Do NOT say "as previously asked" or "as mentioned before". 
If the answer is not in the profile, say: "That detail is not currently listed. Please contact Shashank directly at ${EMAIL}."

CANDIDATE PROFILE:
Name: ${NAME}
Current Role: ${CURRENT_ROLE} at ${CURRENT_COMPANY}
Experience: ${EXPERIENCE_YEARS} years
Current CTC: ${CURRENT_CTC} | Expected CTC: ${EXPECTED_CTC}
Notice Period: ${NOTICE_PERIOD} | Joining: ${JOIN_AVAILABILITY}
Location: ${LOCATION} | Work Mode: ${WORK_MODE} | ${RELOCATION}
Clients: ${CLIENTS}
Domains: ${DOMAINS}
ATS/Tools: ${ATS_TOOLS}, ${JOB_PORTALS}
Certifications: ${CERTIFICATIONS}
Education: ${EDUCATION}
Career History: ${EXPERIENCE_HISTORY}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://shashankdwivedi.vercel.app',
        'X-Title': 'Shashank Portfolio Chatbot',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        max_tokens: 300,
        temperature: 0.4,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) return getGenericFallback(message);

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    return content && content.length > 5 ? content : getGenericFallback(message);
  } catch {
    clearTimeout(timeoutId);
    return getGenericFallback(message);
  }
}

function getGenericFallback(message: string): string {
  const q = normalizeQuery(message);
  if (q.includes('ctc') || q.includes('salary')) return `Current CTC: ${CURRENT_CTC}, Expected CTC: ${EXPECTED_CTC}.`;
  if (q.includes('notice')) return `Notice Period: ${NOTICE_PERIOD}.`;
  if (q.includes('role')) return `Currently working as ${CURRENT_ROLE} at ${CURRENT_COMPANY}.`;
  return `I am ${NAME}, a ${CURRENT_ROLE} with ${EXPERIENCE_YEARS} years of IT recruitment experience. For specific details, please contact: ${EMAIL}`;
}

// ─── MAIN HANDLER ───
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers — always first
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!message) return res.status(400).json({ error: 'Message is required' });
    if (message.length > MAX_MESSAGE_LENGTH) return res.status(400).json({ error: 'Message too long' });

    // 1. Try local knowledge base first (instant, no network)
    const localAnswer = getLocalAnswer(message);
    if (localAnswer) {
      return res.status(200).json({ answer: localAnswer, source: 'knowledge_base' });
    }

    // 2. Fallback to AI
    const aiAnswer = await getAIAnswer(message);
    return res.status(200).json({ answer: aiAnswer, source: 'ai' });

  } catch (err) {
    // Even on total crash — return 200 with fallback (never expose 500 to user)
    console.error('Chat handler error:', err instanceof Error ? err.message : String(err));
    return res.status(200).json({
      answer: `I am ${NAME}, a ${CURRENT_ROLE} with ${EXPERIENCE_YEARS} years of experience in IT recruitment. Please contact me at ${EMAIL} for detailed information.`,
      source: 'fallback'
    });
  }
}