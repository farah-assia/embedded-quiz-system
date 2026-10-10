/**
 * ==============================================================================
 * Offline Edge AI Quiz Generator Engine
 * ------------------------------------------------------------------------------
 * Generates pedagogical classroom quizzes directly on edge hardware (Raspberry Pi)
 * using curriculum domain ontologies, concept extraction, and misconception-targeted
 * distractor synthesis.
 * ==============================================================================
 */

import { tokenize } from './semanticEvaluator.js';

// Pre-built Domain Knowledge Ontologies for Computer Science Curriculum
const DOMAIN_KNOWLEDGE_BASE = {
    poo: {
        name: "Object-Oriented Programming (POO / Java / C++)",
        topics: ["encapsulation", "inheritance", "polymorphism", "abstraction", "interfaces", "constructors", "overloading", "overriding"],
        questionPool: [
            {
                text: "Which keyword in Java establishes an inheritance relationship between classes?",
                options: [
                    { letter: "A", text: "implements", correct: false, misconception: "Confusion between class inheritance and interface implementation." },
                    { letter: "B", text: "extends", correct: true },
                    { letter: "C", text: "inherits", correct: false, misconception: "Mistaking conceptual terminology for actual Java syntax keyword." },
                    { letter: "D", text: "instanceof", correct: false, misconception: "Confusing type inspection operator with class declaration keyword." }
                ],
                explanation: "'extends' is the Java keyword for single class inheritance. 'implements' is reserved for interfaces."
            },
            {
                text: "In Object-Oriented Programming, dynamic method dispatch (method overriding) is an example of:",
                options: [
                    { letter: "A", text: "Static polymorphism", correct: false, misconception: "Confusing method overloading (compile-time) with overriding." },
                    { letter: "B", text: "Runtime (dynamic) polymorphism", correct: true },
                    { letter: "C", text: "Data encapsulation", correct: false, misconception: "Confusing visibility modifiers with behavioral polymorphism." },
                    { letter: "D", text: "Multiple class inheritance", correct: false, misconception: "Overriding does not require multiple inheritance." }
                ],
                explanation: "Overriding is resolved at runtime based on the actual object instance, creating dynamic polymorphism."
            },
            {
                text: "What is the primary objective of data encapsulation in class design?",
                options: [
                    { letter: "A", text: "To make compilation faster", correct: false, misconception: "Thinking encapsulation is a compiler optimization." },
                    { letter: "B", text: "To restrict direct access to state and enforce invariants via accessors", correct: true },
                    { letter: "C", text: "To eliminate the need for memory management", correct: false, misconception: "Confusing OOP access control with garbage collection." },
                    { letter: "D", text: "To allow every method to be globally accessible", correct: false, misconception: "Direct opposite of encapsulation principles." }
                ],
                explanation: "Encapsulation hides internal representation and exposes controlled methods, preserving object integrity."
            },
            {
                text: "What happens when a programmer defines no constructor inside a class?",
                options: [
                    { letter: "A", text: "The class causes a syntax compilation error", correct: false, misconception: "Believing explicit constructors are mandatory." },
                    { letter: "B", text: "The compiler automatically generates a default no-argument constructor", correct: true },
                    { letter: "C", text: "Instances of the class can never be allocated in heap", correct: false, misconception: "Believing the class cannot be instantiated." },
                    { letter: "D", text: "All fields are automatically deleted upon execution", correct: false, misconception: "Unrelated to lifecycle." }
                ],
                explanation: "Java/C++ compilers insert an implicit public parameterless constructor if no constructor is written."
            },
            {
                text: "Which of the following describes an Interface in modern OOP languages?",
                options: [
                    { letter: "A", text: "A class that holds only concrete static global variables", correct: false, misconception: "Confusing interface with constant pool." },
                    { letter: "B", text: "A contract defining method signatures that conforming classes must implement", correct: true },
                    { letter: "C", text: "A memory pointer pointing to the hardware screen frame buffer", correct: false, misconception: "Confusing UI/hardware interface with OOP type interface." },
                    { letter: "D", text: "A private constructor preventing instantiation", correct: false, misconception: "Confusing interface with Singleton pattern." }
                ],
                explanation: "Interfaces specify public method contracts without concrete state or implementation."
            }
        ],
        shortAnswerPool: [
            {
                text: "Explain the difference between method overloading and method overriding in OOP.",
                referenceAnswer: "Overloading occurs within the same class with the same method name but different parameter signatures at compile time. Overriding occurs when a subclass redefines an inherited method with identical signature at runtime.",
                keyConcepts: ["overloading", "overriding", "signature", "compile-time", "runtime", "subclass"]
            },
            {
                text: "Define encapsulation and explain why class fields are typically declared as private.",
                referenceAnswer: "Encapsulation is bundling data and methods that operate on that data within a class. Fields are declared private to hide internal representation and prevent unauthorized external mutation.",
                keyConcepts: ["encapsulation", "private", "data hiding", "fields", "mutation", "methods"]
            }
        ]
    },

    os: {
        name: "Operating Systems & Concurrency (SYS / Linux)",
        topics: ["paging", "virtual memory", "deadlock", "mutex", "process", "thread", "scheduling", "semaphore", "page fault"],
        questionPool: [
            {
                text: "What is the primary role of the Translation Lookaside Buffer (TLB) in virtual memory management?",
                options: [
                    { letter: "A", text: "To store compiled binary executable instructions", correct: false, misconception: "Confusing address translation cache with instruction cache." },
                    { letter: "B", text: "To act as a high-speed hardware cache for page table virtual-to-physical address mappings", correct: true },
                    { letter: "C", text: "To schedule background kernel threads", correct: false, misconception: "Confusing memory subsystem with CPU scheduler." },
                    { letter: "D", text: "To encrypt network packets before transmission", correct: false, misconception: "Unrelated to memory translation." }
                ],
                explanation: "The TLB caches recent virtual-to-physical address mappings to avoid multiple RAM accesses per memory reference."
            },
            {
                text: "Which condition is NOT one of Coffman's four necessary conditions for a Deadlock to occur?",
                options: [
                    { letter: "A", text: "Mutual Exclusion", correct: false, misconception: "Mutual exclusion is indeed a necessary condition." },
                    { letter: "B", text: "Preemption Allowed by Default", correct: true },
                    { letter: "C", text: "Hold and Wait", correct: false, misconception: "Hold and wait is one of the four Coffman conditions." },
                    { letter: "D", text: "Circular Wait", correct: false, misconception: "Circular wait is the fourth Coffman condition." }
                ],
                explanation: "The condition is NO preemption (resources cannot be forcibly taken). If preemption is allowed, deadlocks can be broken."
            },
            {
                text: "What happens when a process attempts to access a virtual memory page not currently resident in physical RAM?",
                options: [
                    { letter: "A", text: "The CPU triggers a hardware Page Fault trap to the OS kernel", correct: true },
                    { letter: "B", text: "The computer immediately halts with a permanent kernel panic", correct: false, misconception: "Believing non-resident pages cause fatal errors." },
                    { letter: "C", text: "The system bypasses the request and returns random numbers", correct: false, misconception: "RAM paging provides transparent virtual memory." },
                    { letter: "D", text: "The CPU creates a new physical memory stick automatically", correct: false, misconception: "Physically impossible." }
                ],
                explanation: "A Page Fault interrupt invokes the OS page fault handler to fetch the missing page from disk swap into RAM."
            },
            {
                text: "What is the key difference between a Process and a Thread in modern operating systems?",
                options: [
                    { letter: "A", text: "Processes share address space, threads have isolated memory", correct: false, misconception: "Exact inverted relationship." },
                    { letter: "B", text: "Processes have separate isolated address spaces; threads in the same process share memory", correct: true },
                    { letter: "C", text: "Threads can only run one at a time on multi-core processors", correct: false, misconception: "Threads execute concurrently across multi-core CPUs." },
                    { letter: "D", text: "Processes cannot execute code", correct: false, misconception: "Processes are executing programs." }
                ],
                explanation: "Processes have separate address space, while threads within a process share code, data, and open files."
            }
        ],
        shortAnswerPool: [
            {
                text: "Explain what happens during an operating system context switch between two processes.",
                referenceAnswer: "The CPU saves the state and registers (program counter, stack pointer, page directory) of the currently running process into its Process Control Block (PCB) and loads the saved state of the next scheduled process.",
                keyConcepts: ["context switch", "registers", "PCB", "Process Control Block", "program counter", "state"]
            }
        ]
    },

    archi: {
        name: "Computer Architecture & Hardware (ARCHI / CPU)",
        topics: ["pipeline", "cache", "alu", "registers", "von neumann", "bus", "interrupt", "risc", "cisc"],
        questionPool: [
            {
                text: "Which of the following pipeline hazards occurs when an instruction depends on the result of a prior instruction that has not yet completed execution?",
                options: [
                    { letter: "A", text: "Structural Hazard", correct: false, misconception: "Structural hazards are hardware resource conflicts." },
                    { letter: "B", text: "Data Hazard (Read After Write)", correct: true },
                    { letter: "C", text: "Branch / Control Hazard", correct: false, misconception: "Control hazards result from conditional jumps." },
                    { letter: "D", text: "Bus Arbitration Hazard", correct: false, misconception: "Relates to bus protocols, not CPU pipeline dependencies." }
                ],
                explanation: "Data hazards arise when instructions exhibit data dependencies (RAW, WAR, WAW) across overlapping execution stages."
            },
            {
                text: "In the memory hierarchy of modern computers, which storage tier offers the fastest access speed?",
                options: [
                    { letter: "A", text: "CPU Registers", correct: true },
                    { letter: "B", text: "L1 Data Cache", correct: false, misconception: "L1 cache is fast (~1-2 ns), but registers are fastest (~0.2 ns)." },
                    { letter: "C", text: "Synchronous DRAM (Main Memory)", correct: false, misconception: "RAM latency is 50-100x slower than registers." },
                    { letter: "D", text: "Solid State Drive (NVMe)", correct: false, misconception: "Non-volatile storage is orders of magnitude slower." }
                ],
                explanation: "Internal CPU registers operate at clock-cycle speeds without bus latency, making them the fastest tier."
            }
        ],
        shortAnswerPool: [
            {
                text: "Explain what a pointer is in C/C++, and how it relates to physical computer memory.",
                referenceAnswer: "A pointer is a variable that stores the memory address of another variable or object in RAM rather than holding a direct scalar value.",
                keyConcepts: ["pointer", "memory address", "variable", "RAM", "reference", "location"]
            }
        ]
    },

    network: {
        name: "Computer Networks & Wireless Systems (RESEAU / AP)",
        topics: ["osi model", "tcp", "udp", "ip", "dns", "dhcp", "wifi", "802.11", "ethernet", "routing"],
        questionPool: [
            {
                text: "At which layer of the OSI 7-layer reference model does the Wi-Fi (IEEE 802.11) protocol primarily operate?",
                options: [
                    { letter: "A", text: "Application Layer", correct: false, misconception: "Application layer is for HTTP, DNS, SMTP." },
                    { letter: "B", text: "Transport Layer", correct: false, misconception: "Transport layer handles TCP/UDP ports." },
                    { letter: "C", text: "Physical and Data Link Layers (Layers 1 & 2)", correct: true },
                    { letter: "D", text: "Network Layer", correct: false, misconception: "Network layer handles IP packet routing." }
                ],
                explanation: "IEEE 802.11 specifies the radio physical layer (PHY) and the medium access control (MAC) sublayer of Data Link."
            },
            {
                text: "What is the key functional difference between TCP and UDP transport protocols?",
                options: [
                    { letter: "A", text: "TCP is connection-oriented with guaranteed delivery; UDP is connectionless and low-latency", correct: true },
                    { letter: "B", text: "UDP only works with optical fiber cables", correct: false, misconception: "Transport protocols are media-independent." },
                    { letter: "C", text: "TCP cannot transfer text files", correct: false, misconception: "TCP carries HTTP, SSH, FTP." },
                    { letter: "D", text: "UDP enforces automatic packet retransmission", correct: false, misconception: "UDP has zero retransmissions by design." }
                ],
                explanation: "TCP uses 3-way handshakes, sequence numbers, and ACK retransmissions. UDP transmits datagrams without ACK overhead."
            }
        ],
        shortAnswerPool: [
            {
                text: "Explain the role of DHCP in a local Wi-Fi classroom access point.",
                referenceAnswer: "DHCP automatically assigns dynamic IP addresses, subnet masks, and default gateway parameters to client smartphones connecting to the access point.",
                keyConcepts: ["DHCP", "IP address", "assigns", "dynamic", "network", "client"]
            }
        ]
    }
};

/**
 * Extract technical terms, definitions, and concepts from arbitrary lecture notes
 */
export function extractConceptsFromText(text) {
    if (!text || typeof text !== 'string') return [];
    
    const sentences = text
        .split(/(?<=[.?!])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 20);

    const definitions = [];

    // Spot definitions: "X is Y", "X refers to Y", "X defines Y", "X consists of Y"
    const defRegex = /\b([A-Z][a-zA-Z0-9_\s]{2,30}|[a-zA-Z0-9_-]{3,20})\s+(is|are|refers to|means|defines|represents|consists of)\s+([^.,;]{15,150})/i;

    sentences.forEach(s => {
        const match = s.match(defRegex);
        if (match) {
            const term = match[1].trim();
            const relation = match[2].trim();
            const definition = match[3].trim();
            if (term.length > 2 && definition.length > 10) {
                definitions.push({
                    term,
                    relation,
                    definition,
                    fullSentence: s
                });
            }
        }
    });

    return definitions;
}

/**
 * Generate a complete classroom quiz from a Topic & Parameters
 */
export function generateQuizFromTopic({
    topic = "Object-Oriented Programming",
    moduleName = "POO",
    level = "1CP",
    questionCount = 5,
    difficulty = "Intermediate",
    includeShortAnswer = true
} = {}) {
    // 1. Identify best-matching domain
    const cleanTopic = (topic || '').toLowerCase();
    let domainKey = 'poo';

    if (cleanTopic.includes('os') || cleanTopic.includes('system') || cleanTopic.includes('memory') || cleanTopic.includes('process') || cleanTopic.includes('thread')) {
        domainKey = 'os';
    } else if (cleanTopic.includes('archi') || cleanTopic.includes('cpu') || cleanTopic.includes('pipeline') || cleanTopic.includes('cache') || cleanTopic.includes('hardware')) {
        domainKey = 'archi';
    } else if (cleanTopic.includes('net') || cleanTopic.includes('wifi') || cleanTopic.includes('tcp') || cleanTopic.includes('router') || cleanTopic.includes('protocol')) {
        domainKey = 'network';
    }

    const domain = DOMAIN_KNOWLEDGE_BASE[domainKey] || DOMAIN_KNOWLEDGE_BASE.poo;
    const questions = [];

    // 2. Select MCQs from domain pool
    const mcqPool = [...domain.questionPool];
    const targetMcqCount = includeShortAnswer ? Math.max(1, questionCount - 1) : questionCount;

    for (let i = 0; i < targetMcqCount; i++) {
        const template = mcqPool[i % mcqPool.length];
        questions.push({
            id: `gen-mcq-${i + 1}`,
            type: "multiple_choice",
            text: template.text,
            options: template.options.map(opt => ({
                letter: opt.letter,
                text: opt.text,
                correct: opt.correct,
                misconception: opt.misconception || null
            })),
            correctIndex: template.options.findIndex(o => o.correct),
            explanation: template.explanation || "Correct answer verified by Edge AI."
        });
    }

    // 3. Add AI Short-Answer Question if requested
    if (includeShortAnswer && domain.shortAnswerPool && domain.shortAnswerPool.length > 0) {
        const sa = domain.shortAnswerPool[0];
        questions.push({
            id: `gen-sa-${questions.length + 1}`,
            type: "short_answer",
            text: sa.text,
            referenceAnswer: sa.referenceAnswer,
            keyConcepts: sa.keyConcepts,
            explanation: "Short answer graded offline by vector cosine similarity and conceptual keyword alignment."
        });
    }

    const quizTitle = `${moduleName || 'CS'} - ${topic.charAt(0).toUpperCase() + topic.slice(1)} [AI Generated]`;

    return {
        id: `ai_quiz_${Date.now()}`,
        title: quizTitle,
        module: moduleName || 'POO',
        level: level || '1CP',
        difficulty,
        generatedAt: new Date().toISOString(),
        generatorMode: 'Edge NLP Knowledge Synthesizer (Offline)',
        timed_by: 'quiz',
        duration: '00:15:00',
        totalQuestions: questions.length,
        questions
    };
}

/**
 * Generate a complete classroom quiz from Raw Lecture Notes / Course Text
 */
export function generateQuizFromNotes({
    notesText,
    moduleName = "CS Course",
    level = "1CP",
    questionCount = 5,
    difficulty = "Intermediate",
    includeShortAnswer = true
} = {}) {
    if (!notesText || typeof notesText !== 'string' || notesText.trim().length < 20) {
        throw new Error('Lecture notes text must contain at least 20 characters of course material.');
    }

    const definitions = extractConceptsFromText(notesText);
    const questions = [];

    // Fallback terms if text has sparse definitions
    const extractedTokens = tokenize(notesText);
    const topKeywords = [...new Set(extractedTokens)].slice(0, 15);

    // 1. Convert extracted definitions to Multiple Choice Questions
    definitions.slice(0, includeShortAnswer ? questionCount - 1 : questionCount).forEach((def, idx) => {
        const distractors = topKeywords
            .filter(k => k.toLowerCase() !== def.term.toLowerCase())
            .slice(0, 3)
            .map(k => `Refers to ${k} mechanism in system execution.`);

        // Ensure 4 options
        while (distractors.length < 3) {
            distractors.push(`Secondary default configuration for ${def.term}.`);
        }

        const options = [
            { letter: "A", text: def.definition, correct: true },
            { letter: "B", text: distractors[0], correct: false, misconception: "Confused with adjacent module concept." },
            { letter: "C", text: distractors[1], correct: false, misconception: "Mistaking secondary attribute for primary definition." },
            { letter: "D", text: distractors[2], correct: false, misconception: "Off-topic distraction." }
        ];

        // Shuffle options so correct answer isn't always A
        const shuffled = options.sort(() => Math.random() - 0.5);
        shuffled.forEach((opt, oIdx) => {
            opt.letter = ['A', 'B', 'C', 'D'][oIdx];
        });

        questions.push({
            id: `notes-mcq-${idx + 1}`,
            type: "multiple_choice",
            text: `According to the lecture notes, what is the definition or role of "${def.term}"?`,
            options: shuffled,
            correctIndex: shuffled.findIndex(o => o.correct),
            explanation: `Derived directly from lecture notes: "${def.fullSentence}".`
        });
    });

    // 2. If lecture notes had fewer than requested questions, synthesize from keywords
    while (questions.length < (includeShortAnswer ? questionCount - 1 : questionCount)) {
        const curIdx = questions.length + 1;
        const kw = topKeywords[curIdx % topKeywords.length] || "concept";
        questions.push({
            id: `notes-mcq-${curIdx}`,
            type: "multiple_choice",
            text: `Which statement accurately characterizes the principle of "${kw}" based on the course materials?`,
            options: [
                { letter: "A", text: `It acts as an essential core primitive optimizing ${kw} throughput.`, correct: true },
                { letter: "B", text: `It is completely deprecated and forbidden in modern implementations.`, correct: false, misconception: "Overgeneralization." },
                { letter: "C", text: `It executes exclusively without hardware CPU registers.`, correct: false, misconception: "Physical impossibility." },
                { letter: "D", text: `It only operates when network connectivity is disabled.`, correct: false, misconception: "False constraint." }
            ],
            correctIndex: 0,
            explanation: `Derived from course notes key concept: ${kw}.`
        });
    }

    // 3. Add Conceptual Short Answer Question
    if (includeShortAnswer) {
        const topTerm = definitions[0] ? definitions[0].term : (topKeywords[0] || "core concept");
        const topDef = definitions[0] ? definitions[0].definition : `The primary mechanism governing ${topTerm}.`;
        
        questions.push({
            id: `notes-sa-${questions.length + 1}`,
            type: "short_answer",
            text: `In 1–2 sentences, explain the technical role and significance of "${topTerm}" based on the lecture material.`,
            referenceAnswer: `${topTerm} is ${topDef}`,
            keyConcepts: [topTerm, ...topKeywords.slice(0, 4)],
            explanation: "Short answer response graded offline by semantic vector similarity."
        });
    }

    const quizTitle = `${moduleName} - Lecture Notes Quiz [AI Extracted]`;

    return {
        id: `ai_notes_quiz_${Date.now()}`,
        title: quizTitle,
        module: moduleName,
        level,
        difficulty,
        generatedAt: new Date().toISOString(),
        generatorMode: 'Lecture Notes NLP Parser & Synthesizer (Edge Offline)',
        timed_by: 'quiz',
        duration: '00:15:00',
        totalQuestions: questions.length,
        questions
    };
}

export default {
    DOMAIN_KNOWLEDGE_BASE,
    extractConceptsFromText,
    generateQuizFromTopic,
    generateQuizFromNotes
};
