export const profile = {
  name: 'Abishek S',
  role: 'AI Engineer',
  email: 'abisheksridharan.work@gmail.com',
  github: 'https://github.com/Abishek9342',
  linkedin: 'https://www.linkedin.com/in/abishek-sridharan-7272562a5/',
  kaggle: 'https://www.kaggle.com/abishek9324',
  whatsappNumber: '919342764046',
  resumeUrl: '/Abishek-resume.pdf',
};

// WhatsApp DM link with a friendly prefilled message (used by Contact and Buddy).
const WHATSAPP_PREFILL = "Hi Abishek, I saw your portfolio and I'd like to connect.";
export const whatsappUrl = `https://wa.me/${profile.whatsappNumber}?text=${encodeURIComponent(WHATSAPP_PREFILL)}`;

// Descriptions use **double asterisks** for the key result, rendered bold
// (see RichText in Experience.tsx).
export type WorkProject = {
  title: string;
  tags: string[];
  description: string;
  link?: string;
};

export type Experience = {
  company: string;
  role: string;
  dates: string;
  projects: WorkProject[];
};

export const experience: Experience[] = [
  {
    company: 'Pothys Retail Pvt Ltd',
    role: 'AI Engineer',
    dates: 'Jul 2026 – Present',
    projects: [
      {
        title: 'PRPL Finance Operations Platform',
        tags: ['FastAPI', 'React 19', 'TypeScript', 'PostgreSQL', 'GCP'],
        description:
          "Built and own the company's finance automation platform, delivering **~20 reconciliation and GST modules used daily** by the finance team. Own the architecture, backend and frontend development, role-based access control, security hardening, **500+ automated tests** and production deployment on Google Cloud.",
      },
      {
        title: 'GST Input Tax Credit Reconciliation',
        tags: ['Python', 'Pandas', 'SAP OData', 'ReportLab'],
        description:
          "Designed a multi-level **GST input tax credit reconciliation engine** that matches SAP purchase records against GSTR-2B **in minutes**, covering exact, date, tax, invoice-similarity and credit-note rules. Integrated the live SAP vendor master over OData to **automate vendor compliance notices**, replacing manual follow-up and protecting the company's input tax credit.",
      },
      {
        title: 'Enterprise Email Integration',
        tags: ['Microsoft Graph API', 'OAuth 2.0', 'PostgreSQL'],
        description:
          "Integrated enterprise email automation with **Microsoft 365 via the Microsoft Graph API**, covering statements, vendor notices, user invitations and system alerts, with certificate-based authentication. Implemented **rate-limited batch delivery** that stays within the organisation's sending limits, with automatic pause and resume for large batches.",
      },
      {
        title: 'LLM Finance Assistant and Agents',
        tags: ['LLM Function Calling', 'Agentic AI', 'FastAPI'],
        description:
          'Built a conversational **LLM assistant** that answers finance questions from **live reconciliation data through function calling** and prepares actions such as sending reports, which **run only after the user confirms them**. Designed scheduled agents, including a **maker/checker agent** in which one model drafts findings and a second independently verifies them against the source data.',
      },
      {
        title: 'AP Accountant Performance Analytics',
        tags: ['Python', 'Pandas', 'PostgreSQL'],
        description:
          "Developed **accountant performance analytics** that track weekly clearance of open vendor items, showing what each accountant cleared, carried forward or newly received and **matching the finance team's manual results exactly**. Ranks accountants on ageing reduction, offset clearance and task completion, with **AI-written management summaries** and a personalised pending-work email for each accountant.",
      },
      {
        title: 'Bank Statement Processing Engine',
        tags: ['Python', 'Pandas', 'LLM Column Mapping'],
        description:
          "Engineered a **configuration-driven bank statement processing engine** with built-in total validation against each statement's summary, replacing multiple bank-specific parsers. Added **AI-assisted onboarding of new formats**, where proposed column mappings are validated on the full file and **approved by a user before use**.",
      },
    ],
  },
  {
    company: 'CobuildX.ai',
    role: 'AI Engineer',
    dates: 'Apr 2025 – Jun 2026',
    projects: [
      {
        title: 'Lead Management MCP Server',
        tags: ['AWS Lambda', 'MCP', 'Claude', 'EventBridge'],
        description:
          'Built a **Model Context Protocol server on AWS Lambda** exposing **8 tools to Claude** for B2B sales automation: lead management, CRM filtering, ideal-customer-profile scoring (0 to 100) and contact enrichment through Apify with a Hunter.io fallback. Added a scheduled EventBridge worker for Slack reminders that **removed the manual steps from sales outreach**.',
        link: 'https://github.com/Abishek9342/lead-management',
      },
      {
        title: 'truAI: Legal RAG Platform',
        tags: ['FastAPI', 'React', 'LangChain', 'AWS Lambda'],
        description:
          'Delivered a **DPDPA-compliant legal research platform** that streams answers with **sub-second first-token latency**, grounded in citations that separate binding statutes from non-binding guidance. Included an automated GitHub scanner for 300+ PII and cookie-compliance patterns, **reducing manual legal review effort by ~40%**.',
      },
      {
        title: 'truScanner (open source, PyPI)',
        tags: ['Python', 'AWS Bedrock', 'Ollama'],
        description:
          'Built and **published an open-source CLI on PyPI** (v0.2.10) that scans codebases for **300+ patterns of personal and financial data**, such as social security numbers, card numbers and API keys, with a three-tier LLM fallback (AWS Bedrock, Ollama, local quantised models) so it **runs fully offline**.',
        link: 'https://pypi.org/project/truscanner',
      },
      {
        title: 'WarpX: AI Collaborative Workspace',
        tags: ['React', 'FastAPI', 'Supabase'],
        description:
          'Designed a **two-level LLM memory architecture** that summarises each thread into a channel-wide context store, so the assistant keeps long-term context while **cutting per-message token cost by ~60%** through summary caching.',
      },
    ],
  },
];

// Personal projects (v2 only for now; the live site doesn't list these yet).
export const playroom = {
  title: 'Playroom: Multiplayer Games App',
  tags: ['React', 'Cloudflare Workers', 'Durable Objects', 'D1', 'WebSockets', 'WebRTC'],
  description:
    "Built and shipped a **mobile-first multiplayer games app** with five games: Word Chain, XO, Patches, 5 Cards and Imposter. Friends join a live room with a 6-letter code, and **the server is the referee**: every move is checked by one rules engine running in a **Cloudflare Durable Object per room**, the same engine that powers practice games against bots. Includes accounts with Google sign-in, **voice chat over WebRTC**, pause and rematch, rankings and an installable PWA, all on Cloudflare's **free plan**.",
  live: 'https://playroom.vibezone-games.workers.dev',
  source: 'https://github.com/Abishek9342/Playroom',
};

export const skillGroups: { label: string; items: string[] }[] = [
  { label: 'Languages', items: ['Python', 'TypeScript', 'JavaScript', 'SQL'] },
  {
    label: 'AI & LLMs',
    items: ['Anthropic Claude', 'LangChain', 'AWS Bedrock', 'Google Vertex AI', 'RAG', 'LLM Agents', 'Ollama', 'PyTorch', 'TensorFlow'],
  },
  {
    label: 'Backend & APIs',
    items: ['FastAPI', 'Pydantic', 'SQLAlchemy', 'MCP', 'REST', 'JWT', 'Microsoft Graph', 'SAP OData'],
  },
  { label: 'Frontend', items: ['React', 'TypeScript', 'Vite', 'Tailwind CSS'] },
  { label: 'Databases', items: ['PostgreSQL', 'Supabase', 'DynamoDB', 'ChromaDB'] },
  { label: 'Cloud & DevOps', items: ['GCP', 'AWS Lambda', 'Docker', 'nginx', 'Linux', 'GitHub Actions', 'Git'] },
  { label: 'Testing', items: ['Pytest', 'Locust'] },
];

export type Publication = {
  title: string;
  detail: string;
  link?: string;
  linkLabel?: string;
};

export const publications: Publication[] = [
  {
    title: 'YOLO-ASCA: A Rule-Based Framework for Identifying Safety Risks in Construction Management',
    detail: 'WiSPNET 2025, SSN College of Engineering, Chennai. Published on IEEE Xplore.',
    link: 'https://ieeexplore.ieee.org/document/11005349/',
    linkLabel: 'View on IEEE Xplore',
  },
  {
    title: 'truScanner v0.2.10',
    detail: 'Open-source CLI for PII and financial data detection, published on PyPI.',
    link: 'https://pypi.org/project/truscanner',
    linkLabel: 'View on PyPI',
  },
];

const K = 'https://www.kaggle.com/datasets/abishek9324/';

export const datasets: Publication[] = [
  {
    title: 'Agent Failure Atlas 2026',
    detail:
      'Reproducible benchmark of multi-step AI-agent trajectories: a 9-table relational dataset with 2,202 runs, 25,964 steps and a 30-category failure taxonomy. The most downloaded of the four.',
    link: K + 'agent-failure-atlas-2026',
    linkLabel: 'View on Kaggle',
  },
  {
    title: 'Fuzzy Invoice Reconciliation',
    detail:
      'Accounts-payable dataset with a solver that applies exact, fuzzy and subset-sum matching in sequence and recovers 94.4% of true matching pairs.',
    link: K + 'fuzzy-invoice-reconciliation',
    linkLabel: 'View on Kaggle',
  },
  {
    title: 'Vendor Subset-Sum Matching',
    detail:
      'Matching vendor payments to combinations of open invoices with a meet-in-the-middle solver: 99.2% precision and 97.5% recall.',
    link: K + 'vendor-subset-sum-matching',
    linkLabel: 'View on Kaggle',
  },
  {
    title: 'Student Performance & Placement Prediction',
    detail:
      '1,500 students with causally related features and two targets (CGPA and placement), covering regression, classification and clustering in one dataset.',
    link: K + 'student-performance-placement-prediction-ml',
    linkLabel: 'View on Kaggle',
  },
];
