// ─── OpportunityTracker — Data & Storage Layer ──────────────────────────────

const DB = (() => {
  const KEYS = { jobs:'ot_jobs', bookmarks:'ot_bm', lastFetch:'ot_lf', resumeSkills:'ot_rs' };
  const get = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const set = (k,v) => localStorage.setItem(k, JSON.stringify(v));
  return {
    getJobs:        ()    => Promise.resolve(get(KEYS.jobs) || []),
    setJobs:        (a)   => { set(KEYS.jobs, a); return Promise.resolve(); },
    getBookmarks:   ()    => Promise.resolve(get(KEYS.bookmarks) || []),
    setBookmarks:   (a)   => { set(KEYS.bookmarks, a); return Promise.resolve(); },
    getLastFetch:   ()    => Promise.resolve(get(KEYS.lastFetch) || 0),
    setLastFetch:   (t)   => { set(KEYS.lastFetch, t); return Promise.resolve(); },
    getResumeSkills:()    => Promise.resolve(get(KEYS.resumeSkills) || null),
    setResumeSkills:(d)   => { set(KEYS.resumeSkills, d); return Promise.resolve(); },
    isBookmarked:   async (id) => (get(KEYS.bookmarks)||[]).some(b=>b.id===id),
    toggleBookmark: async (job) => {
      let bm = get(KEYS.bookmarks) || [];
      const idx = bm.findIndex(b=>b.id===job.id);
      if (idx===-1) bm.unshift(job); else bm.splice(idx,1);
      set(KEYS.bookmarks, bm);
      return idx===-1;
    },
  };
})();


// ─── Dynamic time ────────────────────────────────────────────────────────────
function dynamicTime(ms) {
  const diff = Date.now() - ms; const m = Math.floor(diff/60000);
  if (m<=0) return 'Just Now'; if (m<60) return `${m}m ago`;
  const h=Math.floor(m/60); if(h<24) return `${h}h ago`;
  return `${Math.floor(h/24)} days ago`;
}

// ─── Job Descriptions Generator ──────────────────────────────────────────────
function makeDesc(job) {
  const templates = {
    Research:  `Join ${job.company}'s world-class research team to work on frontier ${job.skills[0]||'AI'} problems. You will collaborate closely with PhDs, publish papers, and build systems that define what comes next in the field.`,
    ML:        `At ${job.company}, you'll design and ship production machine learning systems serving millions of users. Expect to work with cutting-edge infrastructure and influence roadmaps from Day 1.`,
    Mobile:    `Build native mobile experiences used by hundreds of millions of people at ${job.company}. You'll work across ${(job.skills||[]).join(', ')} to ship high-quality, performant apps at scale.`,
    Fintech:   `${job.company} moves money at global scale. As a ${job.role}, you'll help design resilient, low-latency financial systems that enable businesses to accept payments globally with zero downtime.`,
    Data:      `Data is the core product at ${job.company}. You will work on pipelines, warehouses, and analytics systems that process petabytes daily and power real-time decisions across the organization.`,
    Infrastructure:`Build the infrastructure that powers ${job.company}'s global platform. Your work will directly impact reliability, latency, and developer productivity at hyperscale.`,
    SaaS:      `${job.company} is redefining how teams work. As a ${job.role}, you'll build delightful product experiences that millions of professional teams rely on every day.`,
    Design:    `Shape the design systems and creative tooling that empower designers at ${job.company}. Your work will touch every surface of a product used by 4 million+ creatives globally.`,
    Hardware:  `Work at the intersection of hardware and software at ${job.company}. This role involves embedded programming, performance optimization, and cutting-edge silicon engineering.`,
    Cloud:     `Help build the cloud infrastructure backbone at ${job.company}. You'll work with distributed systems, managed services, and developer tooling that power billions of workloads.`,
    Streaming: `${job.company} streams to 230M+ subscribers worldwide. Help build the data and infrastructure systems that power personalization, content delivery, and analytics at that scale.`,
    AutoTech:  `Work on autonomous vehicle systems at ${job.company}'s R&D division. You'll use robotics, computer vision, and simulation to build the future of self-driving mobility.`,
    DevTools:  `Help build the tools that developers love at ${job.company}. Your work will directly improve productivity for 100M+ developers who use the platform every day.`,
  };
  return templates[job.type] || `At ${job.company}, you will contribute directly to the core ${job.role} function. This is a high-ownership, fast-paced role with real impact across a globally distributed engineering team.`;
}
function makeResp(job) {
  const skill0 = job.skills?.[0]||'core technology'; const skill1 = job.skills?.[1]||'systems';
  return [
    `Design and implement ${skill0}-based systems and modules from scratch`,
    `Collaborate with ${job.type==='Research'?'senior researchers':'senior engineers'} on architecture decisions and technical trade-offs`,
    `Write thorough tests, documentation, and participate in code reviews`,
    `Ship features end-to-end and measure impact with data and metrics`,
    `Contribute to team knowledge through presentations and internal demos`,
  ];
}
function makeReqs(job) {
  const skill0=job.skills?.[0]||''; const skill1=job.skills?.[1]||'';
  return [
    `Currently pursuing B.Tech / M.Tech / equivalent in CS, EE, or related`,
    skill0 ? `Strong proficiency in ${skill0}${skill1?` and ${skill1}`:''}` : `Background in software engineering fundamentals`,
    `Proven track record via projects, OSS contributions, or prior internship experience`,
    `Excellent problem-solving skills; strong written and verbal communication`,
  ];
}

// ─── Master Job Pool (60+ positions) ────────────────────────────────────────
const MASTER_JOB_POOL = [
  // Tier S: Premium, always offered first
  {id:'p_openai',   company:'OpenAI',         initials:'OA', bg:'#1a1a1a', fg:'#ffffff', role:'Applied AI Research Intern',   skills:['Python','PyTorch','LLMs','RLHF'],           salary:'₹24 LPA',salaryN:24,duration:'6 months',location:'San Francisco · Remote',type:'Research',  premium:true },
  {id:'p_apple',    company:'Apple',           initials:'AP', bg:'#2d2d2d', fg:'#ffffff', role:'iOS / Flutter Engineer Intern', skills:['Swift','Flutter','SwiftUI','UIKit'],         salary:'₹22 LPA',salaryN:22,duration:'6 months',location:'Cupertino · Onsite',  type:'Mobile',    premium:true },
  {id:'p_nvidia',   company:'NVIDIA',          initials:'NV', bg:'#76b900', fg:'#ffffff', role:'ML Systems Intern',             skills:['CUDA','PyTorch','C++','TensorRT'],           salary:'₹20 LPA',salaryN:20,duration:'6 months',location:'Hyderabad · Hybrid',  type:'Research',  premium:true },
  {id:'p_anthropic',company:'Anthropic',       initials:'AN', bg:'#d97706', fg:'#ffffff', role:'Safety Research Intern',        skills:['Python','RLHF','NLP','Research'],            salary:'₹23 LPA',salaryN:23,duration:'6 months',location:'Remote',             type:'Research',  premium:true },
  {id:'p_deepmind2',company:'Google DeepMind', initials:'GD', bg:'#1d4ed8', fg:'#ffffff', role:'RL Research Intern',            skills:['Python','JAX','RL','TensorFlow'],            salary:'₹26 LPA',salaryN:26,duration:'6 months',location:'London · Hybrid',     type:'Research',  premium:true },
  {id:'p_meta',     company:'Meta AI',         initials:'ME', bg:'#0866ff', fg:'#ffffff', role:'GenAI Engineer Intern',         skills:['PyTorch','Python','CUDA','Transformers'],    salary:'₹23 LPA',salaryN:23,duration:'6 months',location:'Bengaluru · Hybrid',  type:'Research',  premium:true },

  // Tier A
  {id:'a_stripe',   company:'Stripe',          initials:'ST', bg:'#635bff', fg:'#ffffff', role:'Backend Engineer Intern',       skills:['Go','Ruby','PostgreSQL','gRPC'],             salary:'₹18 LPA',salaryN:18,duration:'3 months',location:'Bengaluru · Hybrid',  type:'Fintech',         premium:false},
  {id:'a_databricks',company:'Databricks',     initials:'DB', bg:'#ff3621', fg:'#ffffff', role:'Data Engineering Intern',       skills:['Apache Spark','Python','Scala','SQL'],       salary:'₹19 LPA',salaryN:19,duration:'6 months',location:'Remote',             type:'Data',            premium:false},
  {id:'a_snowflake',company:'Snowflake',        initials:'SF', bg:'#29b5e8', fg:'#ffffff', role:'Cloud Data Intern',             skills:['SQL','Python','dbt','Airflow'],              salary:'₹17 LPA',salaryN:17,duration:'3 months',location:'Pune · Hybrid',       type:'Data',            premium:false},
  {id:'a_figma',    company:'Figma',            initials:'FG', bg:'#f24e1e', fg:'#ffffff', role:'Product Engineer Intern',       skills:['TypeScript','React','WebGL','CSS'],          salary:'₹16 LPA',salaryN:16,duration:'3 months',location:'Bengaluru · Hybrid',  type:'Design',          premium:false},
  {id:'a_vercel',   company:'Vercel',           initials:'VE', bg:'#000000', fg:'#ffffff', role:'Frontend Infra Intern',         skills:['Next.js','TypeScript','Rust','Edge Runtime'], salary:'₹15 LPA',salaryN:15,duration:'6 months',location:'Remote',             type:'Infrastructure',  premium:false},
  {id:'a_notion',   company:'Notion',           initials:'NO', bg:'#1a1a1a', fg:'#ffffff', role:'Product Intern',                skills:['React','Node.js','PostgreSQL','TypeScript'], salary:'₹14 LPA',salaryN:14,duration:'3 months',location:'Bengaluru · Hybrid',  type:'SaaS',            premium:false},
  {id:'a_linear',   company:'Linear',           initials:'LI', bg:'#5e6ad2', fg:'#ffffff', role:'Full Stack Intern',             skills:['TypeScript','React','GraphQL','Electron'],   salary:'₹14 LPA',salaryN:14,duration:'3 months',location:'Remote',             type:'SaaS',            premium:false},
  {id:'a_cloudflare',company:'Cloudflare',      initials:'CF', bg:'#f6821f', fg:'#ffffff', role:'Edge Network Intern',           skills:['Rust','Workers','Go','Networking'],          salary:'₹16 LPA',salaryN:16,duration:'6 months',location:'Bengaluru · Hybrid',  type:'Infrastructure',  premium:false},
  {id:'a_huggingface',company:'Hugging Face',   initials:'HF', bg:'#ffd21e', fg:'#1a1a1a', role:'ML Research Intern',           skills:['Python','Transformers','PyTorch','NLP'],     salary:'₹21 LPA',salaryN:21,duration:'6 months',location:'Remote',             type:'Research',        premium:false},
  {id:'a_mistral',  company:'Mistral AI',       initials:'MI', bg:'#ff6600', fg:'#ffffff', role:'Core LLM Intern',               skills:['Python','PyTorch','C++','CUDA'],             salary:'₹23 LPA',salaryN:23,duration:'6 months',location:'Remote',             type:'Research',        premium:false},
  {id:'a_samsung',  company:'Samsung R&D',      initials:'SR', bg:'#1428a0', fg:'#ffffff', role:'AI/ML Research Intern',         skills:['Python','TensorFlow','C++','Flutter'],       salary:'₹15 LPA',salaryN:15,duration:'6 months',location:'Seoul · Onsite',      type:'Research',        premium:false},
  {id:'a_qualcomm', company:'Qualcomm',         initials:'QC', bg:'#3253dc', fg:'#ffffff', role:'Embedded AI Intern',            skills:['C','C++','ONNX','Edge AI'],                 salary:'₹16 LPA',salaryN:16,duration:'6 months',location:'Hyderabad · Hybrid',  type:'Hardware',        premium:false},
  {id:'a_amd',      company:'AMD',              initials:'AM', bg:'#ed1c24', fg:'#ffffff', role:'GPU Compiler Intern',            skills:['LLVM','C++','ROCm','Python'],               salary:'₹18 LPA',salaryN:18,duration:'6 months',location:'Hyderabad · Hybrid',  type:'Hardware',        premium:false},
  {id:'a_netflix',  company:'Netflix',          initials:'NF', bg:'#e50914', fg:'#ffffff', role:'Data Infra Intern',             skills:['Scala','Apache Spark','Kafka','Python'],     salary:'₹20 LPA',salaryN:20,duration:'6 months',location:'Remote',             type:'Streaming',       premium:false},
  {id:'a_adobe',    company:'Adobe',            initials:'AD', bg:'#fa0f00', fg:'#ffffff', role:'Creative Dev Intern',           skills:['React','WebAssembly','C++','Canvas API'],    salary:'₹13 LPA',salaryN:13,duration:'6 months',location:'Noida · Hybrid',      type:'Design',          premium:false},
  {id:'a_atlassian',company:'Atlassian',        initials:'AT', bg:'#0052cc', fg:'#ffffff', role:'Platform Intern',               skills:['Java','Spring Boot','Kotlin','GraphQL'],     salary:'₹14 LPA',salaryN:14,duration:'3 months',location:'Bengaluru · Hybrid',  type:'SaaS',            premium:false},
  {id:'a_bytedance',company:'ByteDance',        initials:'BD', bg:'#00dcd8', fg:'#1a1a1a', role:'Recommendation Systems Intern', skills:['Python','TensorFlow','Kafka','Go'],          salary:'₹17 LPA',salaryN:17,duration:'3 months',location:'Bengaluru · Hybrid',  type:'ML',              premium:false},
  {id:'a_amazon',   company:'Amazon',           initials:'AZ', bg:'#ff9900', fg:'#1a1a1a', role:'SDE Intern',                    skills:['Java','AWS','DynamoDB','Kotlin'],            salary:'₹15 LPA',salaryN:15,duration:'3 months',location:'Hyderabad · Hybrid',  type:'Cloud',           premium:false},
  {id:'a_airbnb',   company:'Airbnb',           initials:'AB', bg:'#ff5a5f', fg:'#ffffff', role:'Mobile Intern',                 skills:['React Native','Swift','Kotlin','GraphQL'],   salary:'₹14 LPA',salaryN:14,duration:'3 months',location:'Remote',             type:'Mobile',          premium:false},
  {id:'a_supabase', company:'Supabase',         initials:'SB', bg:'#3ecf8e', fg:'#1a1a1a', role:'Backend Intern',               skills:['Rust','PostgreSQL','TypeScript','Deno'],     salary:'₹13 LPA',salaryN:13,duration:'3 months',location:'Remote',             type:'SaaS',            premium:false},
  {id:'a_github',   company:'GitHub',           initials:'GH', bg:'#24292e', fg:'#ffffff', role:'Developer Tools Intern',        skills:['TypeScript','Go','GraphQL','Electron'],      salary:'₹16 LPA',salaryN:16,duration:'3 months',location:'Remote',             type:'DevTools',        premium:false},
  {id:'a_merc',     company:'Mercedes-Benz R&D',initials:'MB', bg:'#555555', fg:'#ffffff', role:'Autonomous Driving Intern',     skills:['Python','ROS','C++','Computer Vision'],      salary:'₹14 LPA',salaryN:14,duration:'6 months',location:'Bengaluru · Onsite',  type:'AutoTech',        premium:false},
  {id:'a_twilio',   company:'Twilio',           initials:'TW', bg:'#f22f46', fg:'#ffffff', role:'Platform Intern',               skills:['Node.js','TypeScript','REST API','AWS'],     salary:'₹13 LPA',salaryN:13,duration:'3 months',location:'Remote',             type:'SaaS',            premium:false},
  {id:'a_planetscale',company:'PlanetScale',    initials:'PS', bg:'#76c6ff', fg:'#1a1a1a', role:'Database Intern',              skills:['Go','MySQL','Vitess','Kubernetes'],           salary:'₹15 LPA',salaryN:15,duration:'3 months',location:'Remote',             type:'Data',            premium:false},
  {id:'a_pagerduty',company:'PagerDuty',        initials:'PD', bg:'#06ac38', fg:'#ffffff', role:'Site Reliability Intern',       skills:['Go','Kubernetes','Prometheus','Python'],     salary:'₹14 LPA',salaryN:14,duration:'3 months',location:'Remote',             type:'Infrastructure',  premium:false},
  {id:'a_confluent',company:'Confluent',        initials:'CN', bg:'#1c1c4b', fg:'#ffffff', role:'Platform Engineering Intern',   skills:['Java','Kafka','Kubernetes','Scala'],         salary:'₹16 LPA',salaryN:16,duration:'6 months',location:'Remote',             type:'Data',            premium:false},
  {id:'a_mongodb',  company:'MongoDB',          initials:'MG', bg:'#023430', fg:'#00ed64', role:'Atlas Dev Intern',              skills:['Python','Node.js','MongoDB','Go'],           salary:'₹14 LPA',salaryN:14,duration:'3 months',location:'Gurgaon · Hybrid',    type:'Data',            premium:false},
  {id:'a_elastic',  company:'Elastic',          initials:'EL', bg:'#fff', fg:'#1a1a1a',   role:'Search Infra Intern',           skills:['Java','Elasticsearch','Lucene','Python'],    salary:'₹13 LPA',salaryN:13,duration:'3 months',location:'Remote',             type:'Data',            premium:false},
  {id:'a_shopify',  company:'Shopify',          initials:'SH', bg:'#96bf48', fg:'#1a1a1a', role:'Commerce Platform Intern',     skills:['Ruby','React','GraphQL','Liquid'],           salary:'₹16 LPA',salaryN:16,duration:'3 months',location:'Remote',             type:'SaaS',            premium:false},
  {id:'a_twitch',   company:'Twitch',           initials:'TC', bg:'#9146ff', fg:'#ffffff', role:'Video Infra Intern',            skills:['Go','C++','HLS','WebRTC'],                  salary:'₹15 LPA',salaryN:15,duration:'3 months',location:'Remote',             type:'Streaming',       premium:false},
  {id:'a_hashicorp',company:'HashiCorp',        initials:'HC', bg:'#7b42bc', fg:'#ffffff', role:'Platform Intern',               skills:['Go','Terraform','HCL','Kubernetes'],         salary:'₹14 LPA',salaryN:14,duration:'3 months',location:'Remote',             type:'Infrastructure',  premium:false},
  {id:'a_obs',      company:'Obsidian',         initials:'OB', bg:'#6e56cf', fg:'#ffffff', role:'Plugin Dev Intern',             skills:['TypeScript','Electron','CSS','Node.js'],     salary:'₹10 LPA',salaryN:10,duration:'3 months',location:'Remote',             type:'DevTools',        premium:false},
  {id:'a_posthog',  company:'PostHog',          initials:'PH', bg:'#d2ff4b', fg:'#1a1a1a', role:'Growth Eng Intern',            skills:['Python','React','PostgreSQL','ClickHouse'],  salary:'₹12 LPA',salaryN:12,duration:'3 months',location:'Remote',             type:'SaaS',            premium:false},
  {id:'a_raycast',  company:'Raycast',          initials:'RC', bg:'#f97316', fg:'#ffffff', role:'macOS Dev Intern',              skills:['Swift','TypeScript','React','AppKit'],       salary:'₹14 LPA',salaryN:14,duration:'3 months',location:'Remote',             type:'DevTools',        premium:false},
  {id:'a_linear2',  company:'Linear',           initials:'LI', bg:'#5e6ad2', fg:'#ffffff', role:'iOS App Intern',                skills:['Swift','SwiftUI','GraphQL','TypeScript'],    salary:'₹13 LPA',salaryN:13,duration:'3 months',location:'Remote',             type:'Mobile',          premium:false},
  {id:'a_neon',     company:'Neon (db)',         initials:'ND', bg:'#00e699', fg:'#1a1a1a', role:'Serverless DB Intern',         skills:['Rust','PostgreSQL','Go','Kubernetes'],        salary:'₹15 LPA',salaryN:15,duration:'3 months',location:'Remote',             type:'Data',            premium:false},
  {id:'a_upstash',  company:'Upstash',          initials:'UP', bg:'#00d15a', fg:'#1a1a1a', role:'Backend Intern',               skills:['Go','TypeScript','Redis','Kafka'],            salary:'₹12 LPA',salaryN:12,duration:'3 months',location:'Remote',             type:'Data',            premium:false},
  {id:'a_buildkite',company:'Buildkite',        initials:'BK', bg:'#14cc80', fg:'#1a1a1a', role:'CI/CD Intern',                 skills:['Go','Ruby','Docker','Kubernetes'],            salary:'₹14 LPA',salaryN:14,duration:'3 months',location:'Remote',             type:'Infrastructure',  premium:false},
  {id:'a_perplexity',company:'Perplexity AI',   initials:'PA', bg:'#20808d', fg:'#ffffff', role:'AI Product Intern',            skills:['Python','LLMs','React','TypeScript'],         salary:'₹22 LPA',salaryN:22,duration:'6 months',location:'Remote',             type:'Research',        premium:false},
  {id:'a_replit',   company:'Replit',           initials:'RL', bg:'#f26207', fg:'#ffffff', role:'IDE Intern',                    skills:['TypeScript','Node.js','Rust','WebAssembly'],  salary:'₹15 LPA',salaryN:15,duration:'3 months',location:'Remote',             type:'DevTools',        premium:false},
  {id:'a_cursor',   company:'Cursor',           initials:'CU', bg:'#000000', fg:'#ffffff', role:'AI Editor Intern',              skills:['TypeScript','Python','LLMs','Electron'],      salary:'₹18 LPA',salaryN:18,duration:'3 months',location:'Remote',             type:'DevTools',        premium:false},
  {id:'a_poe',      company:'Poe (Quora)',       initials:'PQ', bg:'#a82400', fg:'#ffffff', role:'ML Product Intern',            skills:['Python','React','TypeScript','LLMs'],         salary:'₹16 LPA',salaryN:16,duration:'3 months',location:'Remote',             type:'ML',              premium:false},
  {id:'a_cohere',   company:'Cohere',           initials:'CO', bg:'#39594d', fg:'#ffffff', role:'NLP Research Intern',           skills:['Python','PyTorch','NLP','Transformers'],      salary:'₹20 LPA',salaryN:20,duration:'6 months',location:'Remote',             type:'Research',        premium:false},
  {id:'a_influx',   company:'InfluxData',       initials:'IX', bg:'#22adf6', fg:'#ffffff', role:'Time Series DB Intern',         skills:['Go','SQL','Rust','Python'],                   salary:'₹13 LPA',salaryN:13,duration:'3 months',location:'Remote',             type:'Data',            premium:false},
  {id:'a_akka',     company:'Lightbend',        initials:'LB', bg:'#e23237', fg:'#ffffff', role:'Distributed Systems Intern',    skills:['Scala','Akka','Java','Kafka'],                salary:'₹14 LPA',salaryN:14,duration:'3 months',location:'Remote',             type:'Infrastructure',  premium:false},
  {id:'a_temporal', company:'Temporal',         initials:'TP', bg:'#141414', fg:'#ffffff', role:'Workflow Engine Intern',        skills:['Go','Java','gRPC','Kubernetes'],              salary:'₹16 LPA',salaryN:16,duration:'3 months',location:'Remote',             type:'Infrastructure',  premium:false},
  {id:'a_loom',     company:'Loom (Atlassian)', initials:'LM', bg:'#6B47FF', fg:'#ffffff', role:'Video Platform Intern',         skills:['TypeScript','React','WebRTC','Node.js'],      salary:'₹14 LPA',salaryN:14,duration:'3 months',location:'Remote',             type:'SaaS',            premium:false},
  {id:'a_linear3',  company:'Apollo.io',        initials:'AP', bg:'#5c4dff', fg:'#ffffff', role:'Sales AI Intern',               skills:['Python','Node.js','LLMs','PostgreSQL'],       salary:'₹12 LPA',salaryN:12,duration:'3 months',location:'Remote',             type:'SaaS',            premium:false},
  {id:'a_wander',   company:'Wander.com',       initials:'WD', bg:'#ec4899', fg:'#ffffff', role:'Full Stack Intern',             skills:['React','TypeScript','Node.js','PostgreSQL'],   salary:'₹12 LPA',salaryN:12,duration:'3 months',location:'Remote',             type:'SaaS',            premium:false},
  {id:'a_hex',      company:'Hex',              initials:'HX', bg:'#6366f1', fg:'#ffffff', role:'Data Notebook Intern',          skills:['Python','React','PostgreSQL','Spark'],         salary:'₹14 LPA',salaryN:14,duration:'3 months',location:'Remote',             type:'Data',            premium:false},
];

// ─── Default Feed ────────────────────────────────────────────────────────────
const DEFAULT_JOBS = [
  {id:'d_deepmind', company:'Google DeepMind', initials:'GD', bg:'#1d4ed8', fg:'#fff', role:'ML Research Intern',       skills:['Python','TensorFlow','NLP','Research'],    salary:'₹18 LPA',salaryN:18, duration:'6 months',location:'Bengaluru · Hybrid',  type:'Research',  postedTime:'5 days ago', postedOrder:Date.now()-5*86400000, new:false },
  {id:'d_msft',     company:'Microsoft Azure',  initials:'MS', bg:'#00a0e5', fg:'#fff', role:'Cloud Engineer Intern',    skills:['Azure','Docker','Kubernetes','Python'],     salary:'₹14 LPA',salaryN:14, duration:'3 months',location:'Hyderabad · Hybrid', type:'Cloud',     postedTime:'1 week ago',  postedOrder:Date.now()-7*86400000, new:false },
  {id:'d_flipkart', company:'Flipkart',         initials:'FK', bg:'#f7941e', fg:'#fff', role:'Frontend Engineer Intern', skills:['React','TypeScript','Redux','CSS'],         salary:'₹10 LPA',salaryN:10, duration:'6 months',location:'Bengaluru · Onsite', type:'SaaS',      postedTime:'2 weeks ago', postedOrder:Date.now()-14*86400000,new:false },
  {id:'d_razorpay', company:'Razorpay',         initials:'RP', bg:'#2eb8e6', fg:'#fff', role:'Backend Intern',           skills:['Node.js','PostgreSQL','Redis','Go'],        salary:'₹12 LPA',salaryN:12, duration:'4 months',location:'Bengaluru · Hybrid', type:'Fintech',   postedTime:'3 weeks ago', postedOrder:Date.now()-21*86400000,new:false },
  {id:'d_paytm',    company:'Paytm',            initials:'PT', bg:'#002970', fg:'#fff', role:'Data Science Intern',      skills:['Python','SQL','TensorFlow','Pandas'],       salary:'₹10 LPA',salaryN:10, duration:'3 months',location:'Noida · Hybrid',     type:'Fintech',   postedTime:'1 month ago', postedOrder:Date.now()-30*86400000,new:false },
];

// ─── Match Scoring Engine ────────────────────────────────────────────────────
function computeMatchScore(resumeText, job) {
  const text = resumeText.toLowerCase();
  // Skill match
  const skills = (job.skills||[]).map(s=>s.toLowerCase());
  const matchedSkills = skills.filter(s => {
    const words = s.split(/\s+/);
    return words.every(w => text.includes(w));
  });
  const skillScore = skills.length > 0 ? (matchedSkills.length / skills.length) * 55 : 0;
  // Role keyword match
  const roleWords = job.role.toLowerCase().split(/\W+/).filter(w=>w.length>3);
  const roleMatch = roleWords.filter(w => text.includes(w));
  const roleScore = roleWords.length > 0 ? (roleMatch.length / roleWords.length) * 25 : 10;
  // Type keyword
  const typeKeywords = { Research:['research','paper','publication','phd'], ML:['machine learning','neural','model','train'],
    Mobile:['mobile','android','ios','app'], Fintech:['finance','payment','banking'], Data:['data','sql','etl','pipeline'],
    SaaS:['saas','product','feature','customer'], Design:['design','figma','ux','ui'], Hardware:['hardware','embedded','fpga'],
  };
  const typeKws = typeKeywords[job.type] || [];
  const typeScore = typeKws.filter(w=>text.includes(w)).length > 0 ? 10 : 0;
  // Base
  const baseScore = 10;
  const total = Math.round(skillScore + roleScore + typeScore + baseScore);
  return {
    score: Math.max(40, Math.min(total, 99)),
    matchedSkills,
    missingSkills: skills.filter(s=>!matchedSkills.includes(s)),
    totalSkills: skills.length,
  };
}

// ─── ATS Score Engine ────────────────────────────────────────────────────────
function computeATSScore(resumeText) {
  const text = resumeText.toLowerCase();
  const wordCount = resumeText.trim().split(/\s+/).length;
  const feedback = [];
  let score = 0;

  // 1. Length (max 15 pts) — ideal 300-800 words
  if (wordCount >= 300 && wordCount <= 900) {
    score += 15; feedback.push({ ok: true,  msg: `Good resume length (${wordCount} words)` });
  } else if (wordCount >= 150) {
    score += 8;  feedback.push({ ok: false, msg: `Resume is a bit short (${wordCount} words). Aim for 300–800.` });
  } else {
    score += 2;  feedback.push({ ok: false, msg: `Resume is too brief (${wordCount} words). Add projects or descriptions.` });
  }

  // 2. Key sections present (max 20 pts)
  const sections = ['experience', 'education', 'skills', 'projects', 'summary', 'objective', 'certifications', 'achievements'];
  const found = sections.filter(s => text.includes(s));
  const sectionScore = Math.min(20, found.length * 5);
  score += sectionScore;
  if (found.length >= 4) {
    feedback.push({ ok: true,  msg: `Strong structure — ${found.length} sections detected` });
  } else {
    feedback.push({ ok: false, msg: `Add more sections: Experience, Projects, Skills are essential` });
  }

  // 3. Action verbs (max 15 pts)
  const actionVerbs = ['developed','built','designed','implemented','led','managed','created','achieved','improved','reduced',
    'launched','delivered','automated','optimized','engineered','collaborated','researched','analysed','published','deployed','trained'];
  const verbs = actionVerbs.filter(v => text.includes(v));
  if (verbs.length >= 6) {
    score += 15; feedback.push({ ok: true,  msg: `Strong action verbs: ${verbs.slice(0,3).join(', ')}...` });
  } else if (verbs.length >= 3) {
    score += 8;  feedback.push({ ok: false, msg: `Use more action verbs — "developed", "led", "optimized"` });
  } else {
    score += 2;  feedback.push({ ok: false, msg: `Almost no action verbs found. Start bullet points with strong verbs.` });
  }

  // 4. Quantifiable metrics (max 15 pts)
  const hasNumbers = /(\d+%|\$\d+|₹\d+|\d+x|\d+\+|\d+ (users|students|projects|teams|clients|models))/i.test(resumeText);
  const hasMetrics = /(increased|decreased|reduced|improved|grew|saved).{0,60}(\d+%|\d+x|\d+\s+(?:users|students))/i.test(resumeText);
  if (hasMetrics) {
    score += 15; feedback.push({ ok: true,  msg: 'Quantified impact found (numbers & % metrics)' });
  } else if (hasNumbers) {
    score += 8;  feedback.push({ ok: false, msg: 'Add impact metrics — "Improved accuracy by 23%", "Served 10K users"' });
  } else {
    score += 0;  feedback.push({ ok: false, msg: 'No measurable impact detected. Add numbers to achievements.' });
  }

  // 5. Technical keyword density (max 20 pts)
  const techTerms = ['python','java','javascript','react','node','sql','aws','docker','kubernetes','tensorflow','pytorch','machine learning',
    'api','git','agile','typescript','flutter','go','rust','mongodb','redis','ci/cd','linux','microservices','deep learning'];
  const techFound = techTerms.filter(t => text.includes(t));
  if (techFound.length >= 8) {
    score += 20; feedback.push({ ok: true,  msg: `High technical density — ${techFound.length} tech keywords` });
  } else if (techFound.length >= 4) {
    score += 12; feedback.push({ ok: false, msg: `Moderate tech keywords (${techFound.length}). Add more from the job description.` });
  } else {
    score += 3;  feedback.push({ ok: false, msg: `Few tech keywords found. Include tools, languages, and frameworks.` });
  }

  // 6. Contact info (max 15 pts)
  const hasEmail   = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i.test(resumeText);
  const hasPhone   = /(\+?\d[\d\s\-()]{7,}\d)/.test(resumeText);
  const hasLinkedIn = /linkedin/i.test(resumeText);
  const contactScore = (hasEmail ? 7 : 0) + (hasPhone ? 4 : 0) + (hasLinkedIn ? 4 : 0);
  score += contactScore;
  if (contactScore >= 11) {
    feedback.push({ ok: true,  msg: 'Contact info is complete (email + phone + LinkedIn)' });
  } else {
    const missing = [!hasEmail&&'email', !hasPhone&&'phone', !hasLinkedIn&&'LinkedIn'].filter(Boolean);
    feedback.push({ ok: false, msg: `Missing contact info: ${missing.join(', ')}` });
  }

  return { score: Math.min(score, 100), feedback };
}

// ─── Smart Pick: Find New Opportunities ─────────────────────────────────────
async function smartPickJobs(existingIds, count = 4) {
  const available = MASTER_JOB_POOL.filter(j => !existingIds.has(j.id));
  if (available.length === 0) return [];

  const resumeData = await DB.getResumeSkills();

  if (resumeData && resumeData.text) {
    // Score all available, pick top `count`
    const scored = available.map(j => ({
      ...j,
      _score: computeMatchScore(resumeData.text, j).score
    })).sort((a,b) => b._score - a._score);

    // Ensure category diversity: pick best from each type
    const byType = {};
    scored.forEach(j => { if (!byType[j.type]) byType[j.type] = j; });
    const diverse = Object.values(byType).sort((a,b) => b._score - a._score).slice(0, count);
    if (diverse.length >= count) return diverse;
    // Fill remaining from top scores
    const pickedIds = new Set(diverse.map(j=>j.id));
    const rest = scored.filter(j=>!pickedIds.has(j.id)).slice(0, count - diverse.length);
    return [...diverse, ...rest];
  }

  // No resume: pick with diversity + some randomness
  const categories = [...new Set(available.map(j=>j.type))];
  const picks = [];
  const used = new Set();
  // Premiums first
  available.filter(j=>j.premium).forEach(j=>{ if(picks.length < 2) { picks.push(j); used.add(j.id); }});
  // One from each category
  for (const cat of categories) {
    if (picks.length >= count) break;
    const cands = available.filter(j=>!used.has(j.id)&&j.type===cat);
    if (cands.length) {
      const pick = cands[Math.floor(Math.random()*cands.length)];
      picks.push(pick); used.add(pick.id);
    }
  }
  // Fill remaining randomly
  const rest = available.filter(j=>!used.has(j.id));
  while (picks.length < count && rest.length) {
    const idx = Math.floor(Math.random()*rest.length);
    picks.push(rest.splice(idx, 1)[0]);
  }
  return picks.slice(0, count);
}
