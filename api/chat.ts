import type { VercelRequest, VercelResponse } from '@vercel/node';
import { knowledgeBase } from './knowledge';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = 'google/gemma-2-9b-it:free';
const MAX_MESSAGE_LENGTH = 4000;
const API_TIMEOUT = 8000; // 8 seconds to prevent Vercel 10s function timeout

function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[?!.]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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
  if (lower.includes('tell me about yourself') || lower.includes('about yourself') || lower.includes('who are') || lower.includes('about shashank') || lower.includes('summary')) {
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
  if (lower.includes('ats') || lower.includes('vms') || (lower.includes('tools') && !lower.includes('job')) || lower.includes('portal') || lower.includes('platform') || lower.includes('dice') || lower.includes('monster') || lower.includes('careerbuilder') || lower.includes('indeed') || lower.includes('what tools')) {
    return `I have used ATS/VMS tools including Bullhorn, JobDiva, Ceipal, Fieldglass, Beeline, TalentOrb, and Orwin. I have also used job portals like Dice, Monster, CareerBuilder, Indeed, and LinkedIn Recruiter.`;
  }
  if (lower.includes('skill') || lower.includes('strength') || lower.includes('strongest') || lower.includes('skills') || lower.includes('what skills')) {
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
  if (lower.includes('global hiring') || (lower.includes('global') && lower.includes('hiring')) || lower.includes('countries') || lower.includes('regions recruited') || (lower.includes('us') && (lower.includes('recruitment') || lower.includes('it'))) || lower.includes('handled global')) {
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

function getCompactKnowledge(message: string): string {
  const lower = normalizeQuery(message);
  let context = `Name: Shashank Dwivedi\nRole: ${knowledgeBase.personalInfo.currentRole}\n`;
  context += `Experience: 6+ years in US/Global IT and Cybersecurity hiring.\n`;
  context += `Current Company: Softenger (Managing a team of 15 recruiters)\n`;
  
  if (lower.includes('ctc') || lower.includes('salary') || lower.includes('expect')) {
    context += `Current CTC: ${knowledgeBase.screeningInfo.currentCTC}, Expected CTC: ${knowledgeBase.screeningInfo.expectedCTC}\n`;
  }
  if (lower.includes('notice') || lower.includes('join')) {
    context += `Notice Period: ${knowledgeBase.screeningInfo.noticePeriod}, Availability: ${knowledgeBase.screeningInfo.joiningAvailability}\n`;
  }
  if (lower.includes('location') || lower.includes('remote') || lower.includes('hybrid') || lower.includes('relocat')) {
    context += `Location: ${knowledgeBase.screeningInfo.preferredLocation}. Preference: ${knowledgeBase.screeningInfo.workModePreference}. ${knowledgeBase.screeningInfo.openToRelocation}.\n`;
  }
  if (lower.includes('client') || lower.includes('worked with') || lower.includes('companies')) {
    context += `Clients Handled: ${knowledgeBase.clients.slice(0, 12).join(', ')}, etc.\n`;
    context += `Past Companies: GP Aarogya, Prestige Staffing, Experis, Mindlance, Head Field.\n`;
  }
  if (lower.includes('tool') || lower.includes('ats') || lower.includes('vms') || lower.includes('portal')) {
    context += `Tools & Portals: ${knowledgeBase.skills.atsVms.join(', ')}, LinkedIn Recruiter, Dice, Monster.\n`;
  }
  if (lower.includes('role') || lower.includes('hired for') || lower.includes('domain') || lower.includes('cybersecurity') || lower.includes('soc')) {
    context += `Hiring Domains: Cybersecurity, IT Infrastructure, SOC, NOC, VAPT, Cloud, Network Security.\n`;
    context += `Roles Hired: Developers (Java, .NET, React, Python), Data Engineers, Project Managers, Scrum Masters, DevOps, IAM.\n`;
  }
  if (lower.includes('skill') || lower.includes('strength')) {
    context += `Core Skills: End-to-end recruitment, Account Management, Stakeholder Management, Vendor Management, Boolean Search.\n`;
  }
  if (lower.includes('education') || lower.includes('certif')) {
    context += `Education: MCA from Pune University (2021-2023), BCA from ISB&M (2017-2021).\n`;
    context += `Certifications: Lean Six Sigma Green/Yellow Belt, PMP Training, Cyber Security Associate, Talent Acquisition.\n`;
  }
  return context;
}

async function getOpenRouterResponse(message: string): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    return `This is general knowledge, not specific information from Shashank's resume/profile.`;
  }

  try {
    const SYSTEM_PROMPT = `You are Shashank Dwivedi's AI Recruiter Screening Assistant. Answer questions professionally and concisely based ONLY on the provided knowledge. Do not mention "as previously asked" or "as mentioned before". If the exact answer is not in the knowledge, say "That detail is currently not updated, please contact Shashank directly for the latest information."
    
    KNOWLEDGE BASE FOR THIS QUERY:
    ${getCompactKnowledge(message)}
    `;
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: AbortSignal.timeout(API_TIMEOUT),
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

    if (!response.ok) {
      return `This is general knowledge, not specific information from Shashank's resume/profile.`;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || `This is general knowledge, not specific information from Shashank's resume/profile.`;
  } catch (error) {
    if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
      throw { status: 504, message: 'Request timeout' };
    }
    return `This is general knowledge, not specific information from Shashank's resume/profile.`;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log("Chat API request received:", {
      method: req.method,
      hasMessage: Boolean(req.body?.message),
      messagePreview: typeof req.body?.message === "string" ? req.body.message.slice(0, 80) : null
    });

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

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

    // Try knowledge base first
    try {
      const kbAnswer = getKnowledgeAnswer(message);
      console.log("Knowledge lookup result:", {
        matched: Boolean(kbAnswer),
        source: kbAnswer ? "knowledge_base" : "fallback"
      });

      if (kbAnswer) {
        return res.status(200).json({
          answer: kbAnswer,
          source: "knowledge_base"
        });
      }
    } catch (kbErr) {
      console.error("Knowledge base error:", kbErr instanceof Error ? kbErr.message : String(kbErr));
      // Continue to fallback instead of failing
    }

    console.log("OpenRouter config:", {
      hasApiKey: Boolean(process.env.OPENROUTER_API_KEY),
      model: process.env.OPENROUTER_MODEL || OPENROUTER_MODEL
    });

    try {
      const aiAnswer = await getOpenRouterResponse(message);
      return res.status(200).json({
        answer: aiAnswer
      });
    } catch (aiErr) {
      console.error("OpenRouter error:", aiErr instanceof Error ? aiErr.message : String(aiErr));
      return res.status(502).json({
        error: "AI fallback failed. Resume-based answers are still available."
      });
    }
  } catch (err) {
    console.error("Chat API error:", err instanceof Error ? err.message : String(err));
    return res.status(500).json({
      error: "Something went wrong in the chatbot API. Please try again later."
    });
  }
}