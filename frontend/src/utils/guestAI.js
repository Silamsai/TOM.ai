/**
 * tom.ai — Guest AI engine (upgraded: real knowledge responses)
 */

const name = () => {
  try {
    const g = JSON.parse(localStorage.getItem('tom_ai_guest') || '{}');
    return g.name ? g.name.split(' ')[0] : null;
  } catch { return null; }
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export const INTRO = () => {
  const n = name();
  return `Hi${n ? `, **${n}**` : ''}! 👋 I'm **tom**, your AI assistant.\n\nAsk me anything — general knowledge, science, history, coding, math, writing, advice, or just chat. What's on your mind?`;
};

const greetingReply = () => {
  const n = name();
  return pick([
    `Hey${n ? ` ${n}` : ''}! Ready to help — ask me anything.`,
    `Hello${n ? ` ${n}` : ''}! What would you like to know today?`,
    `Hi! I'm here and ready. What can I help you with?`,
  ]);
};

const timeReply = () => {
  const now = new Date();
  const t = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const d = now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  return `It's **${t}** right now, and today is **${d}**.`;
};

const jokeReply = () => pick([
  `Why don't scientists trust atoms?\n\nBecause they **make up everything**. 😄`,
  `Why do programmers prefer dark mode?\n\nBecause **light attracts bugs**. 🐛`,
  `I told my computer I needed a break. Now it won't stop sending me **Kit-Kat ads**. 🍫`,
  `What do you call a fish without eyes?\n\n**A fsh.** 🐟`,
  `Why did the math book look so sad?\n\nBecause it had **too many problems**. 📚`,
]);

const mathReply = (msg) => {
  const clean = msg.replace(/[^0-9+\-*/.() ]/g, '').trim();
  if (clean && /^[\d\s+\-*/.()]+$/.test(clean) && clean.length < 60) {
    try {
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${clean})`)();
      if (typeof result === 'number' && isFinite(result)) {
        const pretty = parseFloat(result.toFixed(8));
        return `**${clean} = ${pretty}** 🔢\n\nNeed help with another calculation?`;
      }
    } catch (_) {}
  }
  return `I can help with math! Share the equation or problem and I'll solve it step by step — arithmetic, algebra, percentages, or logic puzzles.`;
};

const codeReply = (msg) => {
  if (/python/.test(msg)) return `Here's a Python example:\n\n\`\`\`python\ndef greet(name):\n    return f"Hello, {name}!"\n\nprint(greet("World"))\n\`\`\`\n\nWhat would you like the code to do? Give me details and I'll write it.`;
  if (/javascript|js/.test(msg)) return `Here's a JavaScript snippet:\n\n\`\`\`javascript\nconst greet = (name) => \`Hello, \${name}!\`;\nconsole.log(greet("World"));\n\`\`\`\n\nWhat functionality do you need?`;
  if (/html/.test(msg)) return `Here's a basic HTML structure:\n\n\`\`\`html\n<!DOCTYPE html>\n<html lang="en">\n<head>\n  <title>My Page</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>\n\`\`\`\n\nWhat do you want to build?`;
  if (/css/.test(msg)) return `Here's a CSS example:\n\n\`\`\`css\n.button {\n  background: #4285F4;\n  color: white;\n  padding: 12px 24px;\n  border-radius: 8px;\n  border: none;\n  cursor: pointer;\n}\n\`\`\`\n\nWhat styles do you need?`;
  if (/sql/.test(msg)) return `Here's a SQL query example:\n\n\`\`\`sql\nSELECT name, email\nFROM users\nWHERE active = 1\nORDER BY created_at DESC\nLIMIT 10;\n\`\`\`\n\nWhat data do you need to query?`;
  return `I can write code! Tell me:\n\n1. **Language** — Python, JavaScript, HTML, CSS, SQL, etc.\n2. **What it should do** — describe the logic\n3. **Any constraints** — libraries, performance, style\n\nI'll write it right away.`;
};

// ── Knowledge base for common topics ──
const knowledgeReply = (msg) => {
  // Science
  if (/what is (the |a )?(dna|genome|gene)/.test(msg))
    return `**DNA (Deoxyribonucleic Acid)** is a molecule that carries the genetic instructions for the development, functioning, growth, and reproduction of all known living organisms.\n\n🧬 Key facts:\n- DNA is shaped as a **double helix** (two strands twisted together)\n- It's made of **4 bases**: Adenine (A), Thymine (T), Guanine (G), Cytosine (C)\n- Humans have about **3 billion base pairs** in their DNA\n- DNA is found in the **nucleus** of every cell\n- Your DNA is **99.9% identical** to every other human on Earth`;

  if (/what is (ai|artificial intelligence)/.test(msg))
    return `**Artificial Intelligence (AI)** is the simulation of human intelligence by computer systems.\n\n🤖 Key types:\n- **Machine Learning** — systems that learn from data\n- **Deep Learning** — neural networks with many layers\n- **Natural Language Processing (NLP)** — understanding human language\n- **Computer Vision** — interpreting images and video\n\n🌟 Examples: ChatGPT, Google Search, Netflix recommendations, self-driving cars, Siri, Alexa.\n\nAI works by finding patterns in huge amounts of data and using those patterns to make predictions or decisions.`;

  if (/what is (machine learning|ml)/.test(msg))
    return `**Machine Learning (ML)** is a branch of AI where systems learn from data automatically — without being explicitly programmed.\n\n📊 Types:\n- **Supervised Learning** — learns from labeled examples (e.g., spam detection)\n- **Unsupervised Learning** — finds patterns in unlabeled data (e.g., clustering)\n- **Reinforcement Learning** — learns by trial and error with rewards\n\n🔧 Common algorithms: Linear Regression, Decision Trees, Neural Networks, SVM, K-Means\n\n💡 Used in: recommendation systems, image recognition, fraud detection, medical diagnosis.`;

  if (/what is (the |a )?(black hole|blackhole)/.test(msg))
    return `A **black hole** is a region in space where gravity is so strong that nothing — not even light — can escape from it.\n\n🔭 Key facts:\n- Formed when a **massive star collapses** at the end of its life\n- The boundary is called the **event horizon**\n- At the center is a **singularity** — infinite density, zero volume\n- Time slows down near a black hole (**gravitational time dilation**)\n- The nearest known black hole is about **1,000 light-years** from Earth\n- First ever photographed in **2019** (M87 galaxy)`;

  if (/what is (the |a )?(gravity|gravitation)/.test(msg))
    return `**Gravity** is one of the four fundamental forces of nature. It's the force of attraction between objects with mass.\n\n🍎 Key facts:\n- Described by **Newton's Law of Universal Gravitation** (1687)\n- Refined by **Einstein's General Relativity** (1915) — gravity is the curvature of spacetime\n- Earth's gravity accelerates objects at **9.8 m/s²**\n- Keeps planets in orbit around the Sun\n- The **weakest** of the four fundamental forces, but acts over infinite range`;

  // History
  if (/who (was|is) (mahatma |)gandhi/.test(msg))
    return `**Mahatma Gandhi** (1869–1948) was an Indian lawyer, activist, and leader who led India's independence movement against British colonial rule.\n\n🕊️ Key facts:\n- Full name: **Mohandas Karamchand Gandhi**\n- "Mahatma" means **"Great Soul"** in Sanskrit\n- Famous for **non-violent civil disobedience** (Satyagraha)\n- Led the **Salt March** (1930) — 240-mile protest against British salt tax\n- India gained independence on **August 15, 1947**\n- Assassinated on **January 30, 1948** by Nathuram Godse`;

  if (/who (was|is) (albert |)einstein/.test(msg))
    return `**Albert Einstein** (1879–1955) was a German-born theoretical physicist, widely regarded as one of the greatest scientists of all time.\n\n⚛️ Key achievements:\n- Developed the **Theory of Special Relativity** (1905) — E = mc²\n- Developed the **Theory of General Relativity** (1915)\n- Won the **Nobel Prize in Physics** (1921) for the photoelectric effect\n- Predicted **gravitational waves** (confirmed 100 years later in 2015)\n- Contributed to **quantum mechanics**\n- Played a role in initiating the **Manhattan Project** via his letter to FDR`;

  if (/who (was|is) (elon |)musk/.test(msg))
    return `**Elon Musk** (born 1971) is a business magnate, entrepreneur, and investor.\n\n🚀 Key ventures:\n- **Tesla** — electric vehicles and clean energy\n- **SpaceX** — aerospace and goal of colonizing Mars\n- **X (Twitter)** — social media platform\n- **Neuralink** — brain-computer interface\n- **The Boring Company** — tunnel infrastructure\n\n💡 Earlier: Co-founded **PayPal** (originally X.com)\n💰 One of the world's wealthiest people\n🎯 Goal: Make humanity a multi-planetary species`;

  // Movies/Entertainment  
  if (/movie.*rrr|rrr.*movie/.test(msg))
    return `**RRR (2022)** is an Indian Telugu-language epic action film directed by **S.S. Rajamouli**.\n\n🎬 Key details:\n- Full title: **Rise Roar Revolt**\n- Stars: **Ram Charan** as Alluri Sitarama Raju and **Jr. NTR** as Komaram Bheem\n- Based on the lives of two real Indian revolutionaries\n- One of the **highest-grossing Indian films** of all time\n- Song **"Naatu Naatu"** won the **Academy Award (Oscar)** for Best Original Song (2023)\n- Also won the **Golden Globe** for Best Non-English Language Song\n- Available on Netflix`;

  if (/who (made|created|directed) (the |)avengers/.test(msg))
    return `The **Avengers** film series is part of the **Marvel Cinematic Universe (MCU)**, produced by **Marvel Studios**.\n\n🎬 Key directors:\n- **Avengers (2012)** — Joss Whedon\n- **Age of Ultron (2015)** — Joss Whedon\n- **Infinity War (2018)** — Anthony & Joe Russo\n- **Endgame (2019)** — Anthony & Joe Russo\n\n🎭 Key characters: Iron Man, Captain America, Thor, Hulk, Black Widow, Hawkeye\n\n💰 **Endgame** grossed over **$2.8 billion** worldwide — one of the highest-grossing films ever`;

  // Geography
  if (/capital of (india|bharat)/.test(msg))
    return `The capital of **India** is **New Delhi** 🇮🇳\n\nNew Delhi is part of the larger **Delhi** metropolitan area. It serves as the seat of the Government of India and houses the **Parliament**, **Supreme Court**, and **Rashtrapati Bhavan** (President's residence).`;

  if (/capital of (usa|america|united states)/.test(msg))
    return `The capital of the **United States** is **Washington, D.C.** 🇺🇸\n\n"D.C." stands for **District of Columbia**. It's home to the **White House**, **Capitol Building**, and **Supreme Court**. Note: Washington D.C. is NOT a state — it's a federal district.`;

  if (/largest (country|nation) (in the world|by area)/.test(msg))
    return `The largest country in the world by area is **Russia** 🇷🇺\n\n📐 Area: **17.1 million km²** (about 11% of Earth's total land area)\n\nTop 5 largest countries:\n1. 🇷🇺 Russia — 17.1M km²\n2. 🇨🇦 Canada — 10.0M km²\n3. 🇺🇸 United States — 9.8M km²\n4. 🇨🇳 China — 9.6M km²\n5. 🇧🇷 Brazil — 8.5M km²`;

  // Technology
  if (/what is (the |)internet/.test(msg))
    return `The **Internet** is a global network of interconnected computers and servers that communicate using standardized protocols (mainly TCP/IP).\n\n🌐 Key facts:\n- Originated from **ARPANET** in 1969 (US military project)\n- The **World Wide Web (WWW)** was invented by **Tim Berners-Lee** in 1989\n- Over **5 billion people** use the internet today\n- Runs on physical infrastructure: cables, fiber optics, satellites\n- The web is just ONE part of the internet — email, FTP, and other protocols also run on it`;

  if (/what is (blockchain|crypto|bitcoin)/.test(msg))
    return `**Blockchain** is a decentralized, distributed digital ledger that records transactions across many computers.\n\n⛓️ Key concepts:\n- **Decentralized** — no single authority controls it\n- **Immutable** — once recorded, data can't be altered\n- **Transparent** — anyone can verify transactions\n\n💰 **Bitcoin** was the first blockchain application (created by **Satoshi Nakamoto** in 2009)\n\n🔧 Use cases: cryptocurrencies, smart contracts (Ethereum), supply chain, voting systems, NFTs`;

  return null; // no match — use default
};

const writingReply = (msg) => {
  if (/email/.test(msg)) return `I can draft that email! Share:\n\n- **To whom** is it addressed?\n- **Purpose** — request, complaint, follow-up, introduction?\n- **Tone** — formal or friendly?\n\nI'll write a polished draft you can send.`;
  if (/essay|article|blog/.test(msg)) return `Happy to write that! Tell me:\n\n- **Topic** — what should it cover?\n- **Audience** — who will read it?\n- **Length** — short, medium, or long?\n- **Tone** — academic, conversational, or persuasive?`;
  if (/resume|cv/.test(msg)) return `I can help with your resume! Share your:\n\n- **Current role and experience**\n- **Key skills**\n- **Target job/industry**\n\nI'll help you write compelling bullet points and a strong summary.`;
  return `Writing is one of my strengths! I can help with emails, essays, articles, cover letters, resumes, social media captions, or creative fiction.\n\nWhat would you like to write?`;
};

const taskReply = (msg) => {
  if (/add|create|set|make|remind/.test(msg))
    return `Got it! 📌 I've noted that for you.\n\nTo save tasks permanently with deadlines and reminders, **sign in** to unlock the full task manager. For now, I'm happy to help you plan in our chat.\n\nWhat's the next item on your list?`;
  return `Happy to help with planning! Tell me:\n\n- **What** task do you want to organize?\n- **When** is it due?\n- **Priority** — 🔴 high, 🟡 medium, or 🟢 low?\n\nI'll help you structure it step by step.`;
};

const productivityReply = () => pick([
  `Here are productivity techniques that actually work:\n\n**🍅 Pomodoro** — 25 min work, 5 min break. Repeat 4x, then a longer break.\n\n**📋 MIT Rule** — Start each day with your 3 Most Important Tasks.\n\n**📵 Batch Distractions** — Check emails/socials at fixed times, not constantly.\n\n**🌙 End-of-Day Review** — 5 minutes reviewing today + planning tomorrow.\n\nWhich would you like to explore deeper?`,
  `A simple system to stay productive:\n\n1. **Plan the night before** — write tomorrow's tasks before bed\n2. **Eat the frog** — do your hardest task first thing\n3. **Time-block** — assign every task a time slot\n4. **Single-task** — multitasking kills focus\n5. **Weekly review** — every Sunday, reflect on what worked\n\nWant to build a personalized routine?`,
]);

const defaultReply = (msg) => {
  const n = name();
  const lc = msg.toLowerCase();

  // Try to give a relevant answer based on keywords
  if (/who (is|was|are|were)/.test(lc))
    return `That's a great question${n ? `, ${n}` : ''}! Based on what you're asking, could you clarify who you mean? I have knowledge about historical figures, scientists, artists, politicians, celebrities, and more.\n\nJust ask something like "Who is Elon Musk?" or "Who was Newton?" and I'll give you a detailed answer.`;

  if (/what (is|are|was|were)/.test(lc))
    return `Good question! Let me think...\n\nI can answer questions about science, technology, history, geography, math, movies, general knowledge, and much more.\n\nCould you be a bit more specific? For example:\n- "What is machine learning?"\n- "What is the capital of France?"\n- "What is photosynthesis?"`;

  if (/how (do|does|can|to|did)/.test(lc))
    return `Great "how" question${n ? `, ${n}` : ''}! I can walk you through processes, explanations, and step-by-step guides on almost any topic.\n\nCould you give me a bit more detail? Like:\n- "How does the internet work?"\n- "How do I learn Python?"\n- "How to write a cover letter?"`;

  if (/why/.test(lc))
    return `That's a thoughtful question! "Why" questions are my favorite — they get to the root of things.\n\nCould you be more specific? I'll give you a clear, well-explained answer.\n\nFor example: "Why is the sky blue?" or "Why do we dream?"`;

  return pick([
    `Interesting! I'd love to help with that${n ? `, ${n}` : ''}.\n\nCould you give me a bit more detail or context? I can answer questions on science, history, math, technology, movies, writing, coding, advice, and much more — just ask!`,
    `${n ? `${n}, t` : 'T'}hat's a great topic! I have broad knowledge across many subjects.\n\nTry asking me something specific like:\n- "Explain quantum physics"\n- "Who invented the telephone?"\n- "What is React.js?"\n- "Write me a poem about the ocean"\n\nI'll give you a detailed, accurate answer.`,
    `I'm here to help! Ask me anything:\n\n🧠 **Knowledge** — science, history, geography, tech\n💻 **Coding** — any language, debug, explain\n✍️ **Writing** — emails, essays, stories\n🔢 **Math** — calculations, algebra, logic\n💡 **Ideas** — brainstorm, plan, advise\n\nWhat would you like to know?`,
  ]);
};

/* ── Main export ── */
export const generateGuestResponse = async (userMessage) => {
  const msg = userMessage.toLowerCase().trim();
  await sleep(500 + Math.random() * 700);

  if (/^(hi|hello|hey|good (morning|afternoon|evening|night)|howdy|yo|sup)\b/.test(msg))
    return greetingReply();

  if (/how are you|how('re| are) you doing/.test(msg))
    return `I'm doing great — always at my best when helping someone! 😊 What can I do for you${name() ? `, ${name()}` : ''}?`;

  if (/what (can|do) you (do|help|offer)|your (capabilities|features|skills)|what are you/.test(msg))
    return `Here's what I can help with:\n\n💬 **General Q&A** — science, history, tech, geography, movies\n🧠 **Knowledge** — explain any concept clearly\n💻 **Coding** — write, debug, explain code in any language\n✍️ **Writing** — emails, essays, cover letters, stories\n🔢 **Math** — solve equations and calculations\n📋 **Task planning** — organize goals and projects\n💡 **Advice** — productivity, learning, career\n\nJust ask me anything!`;

  if (/\b(joke|funny|laugh|humor)\b/.test(msg)) return jokeReply();
  if (/\b(weather|temperature|forecast|rain|sunny)\b/.test(msg))
    return `I don't have live internet access for real-time weather. Check:\n\n- **weather.com** or **AccuWeather**\n- Google: search "*your city* weather today"\n- Your phone's weather app\n\nIs there anything else I can help with?`;

  if (/\b(time|date|today|day is it)\b/.test(msg)) return timeReply();
  if (/\b(code|program|function|script|algorithm|debug|syntax)\b/.test(msg)) return codeReply(msg);
  if (/\b(write|draft|email|essay|article|blog|letter|caption|resume|cv)\b/.test(msg)) return writingReply(msg);
  if (/\b(task|todo|remind|schedule|plan|goal|deadline|checklist)\b/.test(msg)) return taskReply(msg);
  if (/\b(productive|productivity|focus|habit|routine|efficiency)\b/.test(msg)) return productivityReply();
  if (/([\d][\d\s+\-*/.()]*[\d])/.test(msg) || /\b(calculate|compute|solve|math|add|subtract|multiply|divide)\b/.test(msg))
    return mathReply(msg);
  if (/\b(thank|thanks|thx|appreciate)\b/.test(msg))
    return `You're welcome${name() ? `, ${name()}` : ''}! 😊 Is there anything else on your mind?`;
  if (/\b(bye|goodbye|see you|cya|later)\b/.test(msg))
    return `Take care${name() ? `, ${name()}` : ''}! 👋 Come back anytime — I'll be right here.`;
  if (/who (are you|made you|created you)|what is tom/.test(msg))
    return `I'm **tom.ai** — your personal AI assistant! 🤖\n\nI can answer questions, explain concepts, write content, solve math, help with code, and have intelligent conversations on almost any topic.\n\nThink of me as your always-available smart assistant. What would you like to know?`;

  // Try knowledge base first
  const knowledge = knowledgeReply(msg);
  if (knowledge) return knowledge;

  return defaultReply(msg);
};
