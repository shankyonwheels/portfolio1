/**
 * Chatbot Intent QA Test Suite — ~200 questions
 * Usage: node scripts/test-chatbot-intents.js [--live] [--base-url=URL]
 *
 * Flags:
 *   --live          Hit the real /api/chat endpoint (default: dry-run classification only)
 *   --base-url=URL  Override API base (default: http://localhost:5173)
 *   --batch=N       Run only first N live tests (default: all)
 *   --mandatory     Run only the 20 mandatory test cases
 */

const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

// ── CLI flags ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const LIVE         = args.includes('--live');
const MANDATORY    = args.includes('--mandatory');
const BASE_URL     = (args.find(a => a.startsWith('--base-url=')) || '--base-url=https://shashankdwivedi.vercel.app').split('=')[1];
const BATCH_LIMIT  = parseInt((args.find(a => a.startsWith('--batch=')) || '--batch=999').split('=')[1], 10);
const DELAY_MS     = 1200; // ms between live API calls to avoid rate limits

// ── Intent type detection (mirrors server logic, for dry-run) ────────────
function detectIntentLocal(message) {
  const q = message.toLowerCase();

  const botIdentityPhrases = [
    'what is your name', "what's your name", 'whats your name',
    'who are you', 'who r you', 'what are you',
    'introduce yourself', 'tell me about yourself', 'tell me about you',
    'what can you do', 'how can you help', 'what do you do',
    'are you shashank', 'are you a bot', 'are you ai', 'are you an ai',
    'what kind of bot', 'what kind of assistant',
    'your purpose', 'your function', 'describe yourself',
    'what is this bot', 'about this bot', 'about the assistant',
  ];
  if (botIdentityPhrases.some(p => q.includes(p))) return 'BOT_IDENTITY';

  if (q.includes('job description') || q.includes(' jd ') || q.includes('job desc') ||
      q.includes('suitable for this role') || q.includes('fit for this role') ||
      q.includes('requirements:') || q.includes('responsibilities:') ||
      (q.includes('role') && q.includes('suitable')) || (q.includes('position') && q.includes('fit')))
    return 'JD';

  if (q.includes('write ') || q.includes('draft ') || q.includes('cover letter') ||
      q.includes('inmail') || q.includes('template'))
    return 'WRITING';

  const recruitmentDomainKeywords = [
    'c2c','corp to corp','w2','1099','us staffing','tax term','engagement model',
    'contract to hire','contract-to-hire','full time hiring','direct hire',
    'rtr','right to represent','fieldglass','beeline','bullhorn','jobdiva','ceipal',
    'vms','vendor management system','boolean search','boolean','x-ray search',
    'sourcing','passive candidate','talent mapping',
    'h1b','green card',' gc ','ead','tn visa','l1 visa',
    'us citizen','work authorization','implementation partner','direct client',
    'tier 1','tier-1','staffing agency','staffing model','recruitment lifecycle',
    'rate negotiation','vendor management','client submission','onboarding process',
    'recruitment funnel','hiring pipeline','talent acquisition',
    'dice.com','monster.com','careerbuilder','linkedin recruiter',
  ];
  if (recruitmentDomainKeywords.some(k => q.includes(k))) return 'RECRUITMENT_DOMAIN';

  const cyberITKeywords = [
    'soc analyst','noc engineer','vapt','penetration test',
    'iam ','sailpoint','identity access','privileged access',
    'siem','splunk','qradar','sentinel','arcsight',
    'cybersecurity','cyber security','network security','endpoint security',
    'grc','isms','iso 27001','vulnerability',
    'cloud engineer','cloud architect','aws engineer','azure engineer','gcp',
    'devops engineer','devsecops','kubernetes','docker',
    'linux admin','windows admin','vmware','infrastructure',
    'dba','database administrator','oracle dba','sql server',
    'storage engineer','backup engineer','san','nas',
    'data engineer','data pipeline','etl',
    'java developer','python developer','dot net','.net developer',
    'react developer','node developer','full stack',
    'scrum master','business analyst','project manager',
    'firewall','palo alto','fortinet','checkpoint',
  ];
  const cyberShortTerms = ['soc', 'noc', 'iam', 'dba', 'etl', 'vmware'];
  const qWords = q.split(/[\s?!.,;:()"']+/).filter(Boolean);
  if (cyberITKeywords.some(k => q.includes(k)) || cyberShortTerms.some(k => qWords.includes(k))) return 'CYBER_IT_DOMAIN';

  const profileKeywords = [
    'ctc','salary','package','notice period','notice','join','joining',
    'current role','present role','current company','currently working',
    'location','relocat','remote','hybrid','onsite','wfh',
    'experience','years of','total exp','qualification','education',
    'client','worked with','portfolio','certif','tools','ats','vms',
    'domain','roles hired','hiring domain','contact','email','phone',
    'yourself','about shashank','profile','background','resume','cv',
    'skills','strength','availability','available','open to',
  ];
  if (profileKeywords.some(k => q.includes(k))) {
    if (q.includes('career') || q.includes('growth') || q.includes('why hire') ||
        q.includes('achieve') || q.includes('leadership') || q.includes('goal'))
      return 'CAREER';
    return 'PROFILE';
  }

  const careerKeywords = [
    'career','growth','achieve','accomplish','leadership','manage team',
    'why hire','why should','best candidate','stand out','contribution',
    'stakeholder','account manag','global hiring',
  ];
  if (careerKeywords.some(k => q.includes(k))) return 'CAREER';

  const mixedKeywords = [
    'shashank','for recruitment','for recruiter','best for hiring',
    'for sourcing','for talent','for shashank',
    'how can ai help','ai for recruitment','ai in hiring',
    'recruitment tool','ats software','how ats works',
  ];
  if (mixedKeywords.some(k => q.includes(k))) return 'MIXED';

  return 'GENERAL';
}

// ── Test suite definition ────────────────────────────────────────────────
// Format: { q: string, expectedIntent: string, noUnrelated: boolean, mandatory?: boolean }
// noUnrelated=true means the answer MUST NOT contain "not directly related"
const TESTS = [
  // ── 1. BOT IDENTITY (15) ──────────────────────────────────────────────
  { q: 'What is your name?',                              expectedIntent: 'BOT_IDENTITY', noUnrelated: true, mandatory: true },
  { q: 'Who are you?',                                    expectedIntent: 'BOT_IDENTITY', noUnrelated: true, mandatory: true },
  { q: 'How can you help me?',                            expectedIntent: 'BOT_IDENTITY', noUnrelated: true, mandatory: true },
  { q: 'Introduce yourself.',                             expectedIntent: 'BOT_IDENTITY', noUnrelated: true },
  { q: 'What can you do?',                                expectedIntent: 'BOT_IDENTITY', noUnrelated: true },
  { q: 'Are you Shashank?',                               expectedIntent: 'BOT_IDENTITY', noUnrelated: true },
  { q: 'Are you an AI?',                                  expectedIntent: 'BOT_IDENTITY', noUnrelated: true },
  { q: 'Are you a bot?',                                  expectedIntent: 'BOT_IDENTITY', noUnrelated: true },
  { q: 'What is this bot?',                               expectedIntent: 'BOT_IDENTITY', noUnrelated: true },
  { q: 'Tell me about yourself.',                         expectedIntent: 'BOT_IDENTITY', noUnrelated: true },
  { q: 'What do you do?',                                 expectedIntent: 'BOT_IDENTITY', noUnrelated: true },
  { q: "What's your name?",                               expectedIntent: 'BOT_IDENTITY', noUnrelated: true },
  { q: 'Describe yourself.',                              expectedIntent: 'BOT_IDENTITY', noUnrelated: true },
  { q: 'What is your purpose?',                           expectedIntent: 'BOT_IDENTITY', noUnrelated: true },
  { q: 'What kind of assistant are you?',                 expectedIntent: 'BOT_IDENTITY', noUnrelated: true },

  // ── 2. DIRECT PROFILE (30) ───────────────────────────────────────────
  { q: 'What is Shashank\'s current CTC?',                expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'What is his expected CTC?',                       expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'What is the notice period?',                      expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'When can Shashank join?',                         expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'Where is Shashank based?',                        expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'Is he open to relocation?',                       expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'What is his current company?',                    expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'What is his current role?',                       expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'How many years of experience does he have?',      expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'Tell me about Shashank\'s background.',           expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'What are Shashank\'s skills?',                    expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'What is his education?',                          expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'What certifications does he have?',               expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'Which clients has Shashank worked with?',         expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'What tools does he use?',                         expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'What ATS platforms does Shashank use?',           expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'Is he open to remote work?',                      expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'Is he open to hybrid work?',                      expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'Can I have his contact details?',                 expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'What is his phone number?',                       expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'What is his email?',                              expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'What domains does Shashank specialize in?',       expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'What roles has he hired for?',                    expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'Does he have a LinkedIn?',                        expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'What is his preferred work location?',            expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'How big is his recruitment team?',                expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'What is his MCA?',                                expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'Tell me about his resume.',                       expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'What is Shashank\'s profile summary?',            expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'What is his availability?',                       expectedIntent: 'PROFILE', noUnrelated: true },

  // ── 3. CTC / LOCATION / NOTICE / SCREENING (20) ──────────────────────
  { q: 'Current salary?',                                 expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'Expected salary?',                                expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'What package is he expecting?',                   expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'Can he join immediately?',                        expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'Notice period length?',                           expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'Can he work from Bengaluru?',                     expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'Is Shashank willing to relocate to Mumbai?',      expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'What is his WFH preference?',                     expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'How many years in recruitment?',                  expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'Total work experience?',                          expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'Where does he work currently?',                   expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'What is his highest degree?',                     expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'Is he from Pune?',                                expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'Is he available for a screening call?',           expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'Can I talk to Shashank?',                         expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'Is he onsite friendly?',                          expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'What is his joining availability?',               expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'What companies has he worked for?',               expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'Is he on LinkedIn?',                              expectedIntent: 'PROFILE', noUnrelated: true },
  { q: 'What tools does he use for sourcing?',            expectedIntent: 'PROFILE', noUnrelated: true },

  // ── 4. RECRUITMENT DOMAIN (35) ───────────────────────────────────────
  { q: 'What is the difference between C2C, W2 and 1099?', expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true, mandatory: true },
  { q: 'What is C2C?',                                    expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true, mandatory: true },
  { q: 'What is W2?',                                     expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true, mandatory: true },
  { q: 'What is 1099?',                                   expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true, mandatory: true },
  { q: 'What is RTR?',                                    expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true, mandatory: true },
  { q: 'What is Fieldglass?',                             expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true, mandatory: true },
  { q: 'What is Boolean search?',                         expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true, mandatory: true },
  { q: 'What is Beeline VMS?',                            expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'What is Bullhorn?',                               expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'What is JobDiva?',                                expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'What is Ceipal?',                                 expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'What is talent acquisition?',                     expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'What is US staffing?',                            expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'What is contract-to-hire?',                       expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'What is direct hire?',                            expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'What is VMS in staffing?',                        expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'What is the recruitment lifecycle?',              expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'How do you source passive candidates?',           expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'What is H1B visa?',                               expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'What is EAD?',                                    expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'What is a green card holder?',                    expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'What is L1 visa?',                                expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'What is TN visa?',                                expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'What is talent mapping?',                         expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'What is a tier-1 vendor?',                        expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'What is implementation partner?',                 expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'What is a direct client?',                        expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'What is vendor management?',                      expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'What is rate negotiation in staffing?',           expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'How does onboarding process work in US staffing?', expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'What is corp to corp?',                           expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'What is X-ray search?',                          expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'How to use LinkedIn Recruiter?',                  expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'What is hiring pipeline?',                        expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'What is client submission in staffing?',          expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },

  // ── 5. US STAFFING / TAX TERMS (20) ─────────────────────────────────
  { q: 'Explain US staffing tax terms.',                  expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'What is the difference between W2 and 1099 contractor?', expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'Is C2C better than W2?',                         expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'How is 1099 different from W2?',                  expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'What does corp to corp mean in US hiring?',       expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'Explain work authorization in US staffing.',      expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'What is right to represent?',                     expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'What is a staffing agency model?',                expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'What is US citizen hiring?',                      expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'Explain engagement models in IT staffing.',       expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'Has Shashank done C2C hiring?',                   expectedIntent: 'PROFILE',            noUnrelated: true },
  { q: 'Has Shashank worked with W2 contractors?',        expectedIntent: 'PROFILE',            noUnrelated: true },
  { q: 'Did Shashank recruit 1099 contractors?',          expectedIntent: 'PROFILE',            noUnrelated: true },
  { q: 'What US staffing models has Shashank worked in?', expectedIntent: 'PROFILE',            noUnrelated: true },
  { q: 'How does VMS help in staffing?',                  expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'What is Dice in US staffing?',                    expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'What is Monster in recruitment?',                 expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'What is CareerBuilder?',                          expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'What is a full time hiring model?',               expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },
  { q: 'Explain contract hiring vs full time.',           expectedIntent: 'RECRUITMENT_DOMAIN', noUnrelated: true },

  // ── 6. CYBERSECURITY / IT DOMAIN (30) ────────────────────────────────
  { q: 'What is SOC?',                                    expectedIntent: 'CYBER_IT_DOMAIN', noUnrelated: true, mandatory: true },
  { q: 'What is VAPT?',                                   expectedIntent: 'CYBER_IT_DOMAIN', noUnrelated: true, mandatory: true },
  { q: 'What is IAM?',                                    expectedIntent: 'CYBER_IT_DOMAIN', noUnrelated: true, mandatory: true },
  { q: 'What is SIEM?',                                   expectedIntent: 'CYBER_IT_DOMAIN', noUnrelated: true, mandatory: true },
  { q: 'What is a SOC Analyst?',                          expectedIntent: 'CYBER_IT_DOMAIN', noUnrelated: true },
  { q: 'What does an NOC Engineer do?',                   expectedIntent: 'CYBER_IT_DOMAIN', noUnrelated: true },
  { q: 'What is cybersecurity?',                          expectedIntent: 'CYBER_IT_DOMAIN', noUnrelated: true },
  { q: 'What is network security?',                       expectedIntent: 'CYBER_IT_DOMAIN', noUnrelated: true },
  { q: 'What is endpoint security?',                      expectedIntent: 'CYBER_IT_DOMAIN', noUnrelated: true },
  { q: 'What is Splunk used for?',                        expectedIntent: 'CYBER_IT_DOMAIN', noUnrelated: true },
  { q: 'What is GRC?',                                    expectedIntent: 'CYBER_IT_DOMAIN', noUnrelated: true },
  { q: 'What is cloud engineering?',                      expectedIntent: 'CYBER_IT_DOMAIN', noUnrelated: true },
  { q: 'What is DevOps?',                                 expectedIntent: 'CYBER_IT_DOMAIN', noUnrelated: true },
  { q: 'What is a DBA?',                                  expectedIntent: 'CYBER_IT_DOMAIN', noUnrelated: true },
  { q: 'What is SailPoint?',                              expectedIntent: 'CYBER_IT_DOMAIN', noUnrelated: true },
  { q: 'What does a data engineer do?',                   expectedIntent: 'CYBER_IT_DOMAIN', noUnrelated: true },
  { q: 'What is Kubernetes?',                             expectedIntent: 'CYBER_IT_DOMAIN', noUnrelated: true },
  { q: 'What is penetration testing?',                    expectedIntent: 'CYBER_IT_DOMAIN', noUnrelated: true },
  { q: 'What is ISO 27001?',                              expectedIntent: 'CYBER_IT_DOMAIN', noUnrelated: true },
  { q: 'What is VMware?',                                 expectedIntent: 'CYBER_IT_DOMAIN', noUnrelated: true },
  { q: 'What is a scrum master?',                         expectedIntent: 'CYBER_IT_DOMAIN', noUnrelated: true },
  { q: 'What does a project manager do?',                 expectedIntent: 'CYBER_IT_DOMAIN', noUnrelated: true },
  { q: 'What is a full stack developer?',                 expectedIntent: 'CYBER_IT_DOMAIN', noUnrelated: true },
  { q: 'What is a business analyst?',                     expectedIntent: 'CYBER_IT_DOMAIN', noUnrelated: true },
  { q: 'What is palo alto firewall?',                     expectedIntent: 'CYBER_IT_DOMAIN', noUnrelated: true },
  { q: 'What is Azure cloud?',                            expectedIntent: 'CYBER_IT_DOMAIN', noUnrelated: true },
  { q: 'What is AWS engineer role?',                      expectedIntent: 'CYBER_IT_DOMAIN', noUnrelated: true },
  { q: 'What is storage engineer?',                       expectedIntent: 'CYBER_IT_DOMAIN', noUnrelated: true },
  { q: 'What is backup engineer?',                        expectedIntent: 'CYBER_IT_DOMAIN', noUnrelated: true },
  { q: 'What is identity access management?',             expectedIntent: 'CYBER_IT_DOMAIN', noUnrelated: true },

  // ── 7. CAREER ANALYSIS (20) ───────────────────────────────────────────
  { q: 'Why should we hire Shashank?',                    expectedIntent: 'CAREER', noUnrelated: true, mandatory: true },
  { q: 'Is Shashank suitable for this role?',             expectedIntent: 'JD',     noUnrelated: true, mandatory: true },
  { q: 'What makes Shashank a strong candidate?',         expectedIntent: 'CAREER', noUnrelated: true },
  { q: 'What are his biggest achievements?',              expectedIntent: 'CAREER', noUnrelated: true },
  { q: 'How has Shashank contributed to business growth?', expectedIntent: 'CAREER', noUnrelated: true },
  { q: 'What is his leadership experience?',              expectedIntent: 'CAREER', noUnrelated: true },
  { q: 'How can Shashank grow in the next 5 years?',      expectedIntent: 'CAREER', noUnrelated: true },
  { q: 'What is Shashank\'s career goal?',                expectedIntent: 'CAREER', noUnrelated: true },
  { q: 'Why is Shashank the best candidate?',             expectedIntent: 'CAREER', noUnrelated: true },
  { q: 'How does Shashank stand out from other recruiters?', expectedIntent: 'CAREER', noUnrelated: true },
  { q: 'Tell me about his account management experience.', expectedIntent: 'CAREER', noUnrelated: true },
  { q: 'How does Shashank handle global hiring?',         expectedIntent: 'CAREER', noUnrelated: true },
  { q: 'What is his stakeholder management experience?',  expectedIntent: 'CAREER', noUnrelated: true },
  { q: 'Has he achieved any recruitment targets?',        expectedIntent: 'CAREER', noUnrelated: true },
  { q: 'Is Shashank suitable for a Talent Acquisition Manager role?', expectedIntent: 'CAREER', noUnrelated: true },
  { q: 'Is he suitable for an Account Manager position?', expectedIntent: 'CAREER', noUnrelated: true },
  { q: 'What are Shashank\'s leadership goals?',          expectedIntent: 'CAREER', noUnrelated: true },
  { q: 'What is the biggest achievement at Softenger?',   expectedIntent: 'CAREER', noUnrelated: true },
  { q: 'How does he manage a team of 15?',                expectedIntent: 'CAREER', noUnrelated: true },
  { q: 'What can Shashank contribute to my organization?', expectedIntent: 'CAREER', noUnrelated: true },

  // ── 8. JD FLOW (15) ──────────────────────────────────────────────────
  { q: 'I have a job description. Can you analyze it?',   expectedIntent: 'JD',   noUnrelated: true },
  { q: 'Is Shashank suitable for the role?',              expectedIntent: 'JD',   noUnrelated: true },
  { q: 'Does his profile fit this position?',             expectedIntent: 'JD',   noUnrelated: true },
  { q: 'Evaluate Shashank for this JD.',                  expectedIntent: 'JD',   noUnrelated: true },
  { q: 'Screen Shashank for this requirement.',           expectedIntent: 'JD',   noUnrelated: true },
  { q: 'Assess him for this job.',                        expectedIntent: 'JD',   noUnrelated: true },
  { q: 'Good fit for this role?',                         expectedIntent: 'JD',   noUnrelated: true },
  { q: 'Here is the job description: Responsibilities: ...', expectedIntent: 'JD', noUnrelated: true },
  { q: 'Requirements: 5 years recruitment experience...',  expectedIntent: 'JD',  noUnrelated: true },
  { q: 'Qualifications: MCA or equivalent degree...',     expectedIntent: 'JD',   noUnrelated: true },
  { q: 'How does Shashank match this JD?',                expectedIntent: 'JD',   noUnrelated: true },
  { q: 'Is his profile right for this role?',             expectedIntent: 'JD',   noUnrelated: true },
  { q: 'Is he a good fit for this position?',             expectedIntent: 'JD',   noUnrelated: true },
  { q: 'Fit for this role?',                              expectedIntent: 'JD',   noUnrelated: true },
  { q: 'Does Shashank qualify for this job?',             expectedIntent: 'JD',   noUnrelated: true },

  // ── 9. GENERAL / MIXED (15 + mandatory 5) ────────────────────────────
  { q: 'Where is America?',                               expectedIntent: 'GENERAL', noUnrelated: false, mandatory: true },
  { q: 'Tell me something about laptops.',                expectedIntent: 'GENERAL', noUnrelated: false, mandatory: true },
  { q: 'Which laptop is best for Shashank\'s recruitment and AI work?', expectedIntent: 'MIXED', noUnrelated: true, mandatory: true },
  { q: 'How can AI help in recruitment?',                 expectedIntent: 'MIXED',   noUnrelated: true, mandatory: true },
  { q: 'Tell me a joke.',                                 expectedIntent: 'GENERAL', noUnrelated: false },
  { q: 'Who is Virat Kohli?',                             expectedIntent: 'GENERAL', noUnrelated: false },
  { q: 'Explain photosynthesis.',                         expectedIntent: 'GENERAL', noUnrelated: false },
  { q: 'What is the capital of France?',                  expectedIntent: 'GENERAL', noUnrelated: false },
  { q: 'Recipe for pasta.',                               expectedIntent: 'GENERAL', noUnrelated: false },
  { q: 'What are the planets?',                           expectedIntent: 'GENERAL', noUnrelated: false },
  { q: 'How does photosynthesis work?',                   expectedIntent: 'GENERAL', noUnrelated: false },
  { q: 'What is the speed of light?',                     expectedIntent: 'GENERAL', noUnrelated: false },
  { q: 'How do I make coffee?',                           expectedIntent: 'GENERAL', noUnrelated: false },
  { q: 'What is the best programming language?',          expectedIntent: 'GENERAL', noUnrelated: false },
  { q: 'What is the best laptop for AI work for Shashank?', expectedIntent: 'MIXED', noUnrelated: true },

  // ── Extra mixed/connected questions (fills to ~200) ──────────────────
  { q: 'What is ATS software?',                           expectedIntent: 'MIXED',              noUnrelated: true },
  { q: 'How does ATS work?',                              expectedIntent: 'MIXED',              noUnrelated: true },
  { q: 'How can AI improve recruitment for Shashank?',    expectedIntent: 'MIXED',              noUnrelated: true },
  { q: 'What is AI in hiring?',                           expectedIntent: 'MIXED',              noUnrelated: true },
  { q: 'Write a LinkedIn InMail for a candidate.',        expectedIntent: 'WRITING',            noUnrelated: true },
  { q: 'Draft a candidate rejection email.',              expectedIntent: 'WRITING',            noUnrelated: true },
  { q: 'Write a cover letter for Shashank.',              expectedIntent: 'WRITING',            noUnrelated: true },
  { q: 'Has Shashank done US hiring?',                    expectedIntent: 'PROFILE',            noUnrelated: true },
  { q: 'Shashank\'s global hiring experience?',           expectedIntent: 'PROFILE',            noUnrelated: true },
  { q: 'What is cybersecurity hiring?',                   expectedIntent: 'CYBER_IT_DOMAIN',    noUnrelated: true },
];

// ── Utilities ────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const UNRELATED_PHRASES = [
  'not directly related to shashank',
  'not related to shashank',
  "not related to shashank's profile",
  "not related to shashank's resume",
  'not about shashank',
  'not related to his profile',
];

function containsUnrelated(text) {
  const lower = text.toLowerCase();
  return UNRELATED_PHRASES.some(p => lower.includes(p));
}

function post(urlStr, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const data = JSON.stringify(body);
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
      timeout: 15000,
    }, res => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: raw });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('TIMEOUT')); });
    req.write(data);
    req.end();
  });
}

// ── Main runner ──────────────────────────────────────────────────────────
async function runTests() {
  const tests = MANDATORY
    ? TESTS.filter(t => t.mandatory)
    : TESTS;

  const limitedTests = tests.slice(0, BATCH_LIMIT);
  const total = limitedTests.length;

  const results = [];
  let passed = 0, failed = 0;

  console.log(`\n${'═'.repeat(80)}`);
  console.log(`  Shashank Dwivedi Chatbot — Intent QA Test Suite`);
  console.log(`  Mode: ${LIVE ? 'LIVE' : 'DRY-RUN (local classification)'} | Tests: ${total} | Base: ${BASE_URL}`);
  console.log(`${'═'.repeat(80)}\n`);

  for (let i = 0; i < limitedTests.length; i++) {
    const test = limitedTests[i];
    const num = String(i + 1).padStart(3, ' ');

    // Dry-run: local intent detection
    const localIntent = detectIntentLocal(test.q);
    let intentMatch = localIntent === test.expectedIntent;

    let liveStatus = null;
    let liveIntent = null;
    let liveAnswer = null;
    let hasUnrelated = false;
    let liveError = null;

    if (LIVE) {
      try {
        const res = await post(`${BASE_URL}/api/chat`, {
          message: test.q,
          usedQuestions: [],
        });
        liveStatus = res.status;
        if (res.status === 200) {
          const json = JSON.parse(res.body);
          liveIntent  = json.intent || null;
          liveAnswer  = json.answer || '';
          hasUnrelated = containsUnrelated(liveAnswer);
          if (liveIntent) intentMatch = liveIntent === test.expectedIntent;
        } else {
          liveError = `HTTP ${res.status}`;
        }
      } catch (e) {
        liveError = e.message;
      }
      await sleep(DELAY_MS);
    }

    // Determine pass/fail
    const intentOk = intentMatch;
    const unrelatedOk = test.noUnrelated
      ? !hasUnrelated          // must NOT have unrelated phrase
      : true;                  // don't care (it may or may not say unrelated)
    const statusOk  = !LIVE || liveStatus === 200;
    const pass = intentOk && unrelatedOk && statusOk && !liveError;

    if (pass) passed++; else failed++;

    const statusIcon = pass ? '✅' : '❌';
    const intentIcon = intentOk ? '✓' : '✗';
    const unrelIcon  = unrelatedOk ? '✓' : '✗';

    const detectedLabel = LIVE ? liveIntent || localIntent : localIntent;
    console.log(
      `${statusIcon} ${num}. [${test.expectedIntent.padEnd(20)}|got:${detectedLabel.padEnd(20)}] ${intentIcon}intent ${unrelIcon}unrelated ` +
      (LIVE ? `HTTP:${liveStatus || liveError} ` : '') +
      `"${test.q.slice(0, 60)}${test.q.length > 60 ? '…' : ''}"`
    );

    if (!pass) {
      if (!intentOk)   console.log(`   ↳ Intent mismatch: expected ${test.expectedIntent}, got ${detectedLabel}`);
      if (!unrelatedOk) console.log(`   ↳ Answer contains "not related" but should NOT`);
      if (!statusOk)    console.log(`   ↳ HTTP status: ${liveStatus} (expected 200)`);
      if (liveError)    console.log(`   ↳ Error: ${liveError}`);
      if (liveAnswer && !unrelatedOk) {
        console.log(`   ↳ Answer snippet: "${liveAnswer.slice(0, 120)}…"`);
      }
    }

    results.push({
      n: i + 1,
      question: test.q,
      expectedIntent: test.expectedIntent,
      detectedIntent: detectedLabel,
      intentMatch,
      noUnrelated: test.noUnrelated,
      hasUnrelated,
      unrelatedOk,
      liveStatus,
      liveError,
      pass,
      mandatory: !!test.mandatory,
    });
  }

  // ── Summary ─────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`  RESULTS: ${passed}/${total} passed (${failed} failed)`);
  console.log(`${'─'.repeat(80)}`);

  const mandatoryFails = results.filter(r => r.mandatory && !r.pass);
  if (mandatoryFails.length > 0) {
    console.log(`\n  ⚠️  MANDATORY TEST FAILURES (${mandatoryFails.length}):`);
    mandatoryFails.forEach(r => {
      console.log(`     ${r.n}. "${r.question}"`);
      console.log(`        expected:${r.expectedIntent} | got:${r.detectedIntent}`);
    });
  } else {
    console.log(`\n  ✅ All mandatory tests passed.`);
  }

  // ── Save report ─────────────────────────────────────────────────────
  const report = {
    generated: new Date().toISOString(),
    mode: LIVE ? 'live' : 'dry-run',
    baseUrl: BASE_URL,
    total,
    passed,
    failed,
    passRate: `${((passed / total) * 100).toFixed(1)}%`,
    results,
  };
  const outPath = path.join(process.cwd(), 'qa-chatbot-intent-report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\n  📄 Report saved: ${outPath}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
