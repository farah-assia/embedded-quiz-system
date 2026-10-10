/**
 * κουίζυ (Quizy) — Offline Edge AI Semantic Evaluator & Concept Clusterer
 * 
 * Implements a 100% local Vector Space Model (VSM) using TF-IDF,
 * N-gram feature extraction, Cosine Similarity, and K-Medoids/Distance
 * Clustering running on Node.js without any cloud dependency.
 */

// Common stop-words for English and French (excluding technical prepositions like 'of', 'in' where relevant)
const STOP_WORDS = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as',
    'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'cannot',
    'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had',
    'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if',
    'in', 'into', 'is', 'isn\'t', 'it', 'its', 'itself', 'let\'s', 'me', 'more', 'most', 'my', 'myself', 'no',
    'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out',
    'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs',
    'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under',
    'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why',
    'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves',
    // French common stop words
    'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'ce', 'cet', 'cette', 'ces', 'et', 'ou', 'qui', 'que',
    'dans', 'en', 'par', 'pour', 'sur', 'avec', 'est', 'sont', 'une', 'qui', 'au', 'aux'
]);

// Computer Science and technical domain synonym canonicalization
const CANONICAL_MAP = {
    // Memory & Addresses
    'location': 'address',
    'locations': 'address',
    'locat': 'address',
    'addr': 'address',
    'cell': 'address',
    'ram': 'memory',
    'storage': 'memory',
    
    // Pointers & References
    'points': 'pointer',
    'pointing': 'pointer',
    'point': 'pointer',
    'reference': 'pointer',
    'ref': 'pointer',
    
    // Store / Hold / Contain
    'holds': 'store',
    'holding': 'store',
    'hold': 'store',
    'contains': 'store',
    'contain': 'store',
    'stores': 'store',
    'storing': 'store',
    'saved': 'store',
    'saves': 'store',
    'keeps': 'store',
    'keep': 'store',
    
    // Variables & Data Structures
    'object': 'variable',
    'objects': 'variable',
    'vars': 'variable',
    'var': 'variable',
    'identifier': 'variable',
    'structure': 'variable',
    'struct': 'variable',
    'val': 'value',
    'values': 'value'
};

/**
 * Lightweight rule-based word stemmer
 */
function stemWord(word) {
    if (!word || word.length <= 3) return word;
    if (word.endsWith('sses')) return word.slice(0, -2);
    if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
    if (word.endsWith('ing') && word.length > 5) return word.slice(0, -3);
    if (word.endsWith('ed') && word.length > 4) return word.slice(0, -2);
    if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) return word.slice(0, -1);
    return word;
}

/**
 * Normalize word to canonical technical concept
 */
function normalizeWord(word) {
    const stemmed = stemWord(word);
    return CANONICAL_MAP[word] || CANONICAL_MAP[stemmed] || stemmed;
}

/**
 * Tokenize, clean and normalize text into word and bigram features
 */
export function tokenize(text, includeNgrams = true) {
    if (!text || typeof text !== 'string') return [];
    
    // Clean string: preserve alphanumeric and programming chars (_, *)
    const clean = text
        .toLowerCase()
        .replace(/['’]/g, ' ')
        .replace(/[^a-z0-9_\s*]/g, ' ')
        .trim();
    
    const rawWords = clean.split(/\s+/).filter(w => w.length > 1 && !STOP_WORDS.has(w));
    const words = rawWords.map(normalizeWord);
    
    if (!includeNgrams || words.length < 2) {
        return words;
    }
    
    // Generate bigrams (e.g. "memory address", "data type")
    const bigrams = [];
    for (let i = 0; i < words.length - 1; i++) {
        bigrams.push(`${words[i]}_${words[i + 1]}`);
    }
    
    return [...words, ...bigrams];
}

/**
 * Calculate Term Frequency (TF) for a token list
 */
function computeTF(tokens) {
    const tf = {};
    const total = tokens.length;
    if (total === 0) return tf;
    
    for (const t of tokens) {
        tf[t] = (tf[t] || 0) + 1;
    }
    for (const t in tf) {
        tf[t] = tf[t] / total;
    }
    return tf;
}

/**
 * Vectorize a collection of documents into TF-IDF vectors
 */
export function vectorizeDocuments(docs) {
    const tokenizedDocs = docs.map(d => tokenize(d));
    const N = tokenizedDocs.length;
    
    // Compute Document Frequency (DF)
    const df = {};
    for (const tokens of tokenizedDocs) {
        const uniqueTokens = new Set(tokens);
        for (const t of uniqueTokens) {
            df[t] = (df[t] || 0) + 1;
        }
    }
    
    // Compute Smoothed IDF
    const idf = {};
    for (const t in df) {
        idf[t] = 1.0 + Math.log((N + 1) / (df[t] + 0.5));
    }
    
    // Build vocabulary dictionary
    const vocab = Object.keys(df);
    const vocabIndex = {};
    vocab.forEach((t, i) => vocabIndex[t] = i);
    
    // Compute dense TF-IDF vectors
    const vectors = tokenizedDocs.map(tokens => {
        const tf = computeTF(tokens);
        const vec = new Float64Array(vocab.length);
        for (const t in tf) {
            const idx = vocabIndex[t];
            if (idx !== undefined) {
                vec[idx] = tf[t] * (idf[t] || 1.0);
            }
        }
        return vec;
    });
    
    return { vectors, vocab, vocabIndex, idf };
}

/**
 * Compute Cosine Similarity between two vectors
 */
export function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    
    let dot = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
        const a = vecA[i];
        const b = vecB[i];
        dot += a * b;
        normA += a * a;
        normB += b * b;
    }
    
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Check keyword and concept coverage
 */
export function checkKeyConcepts(text, keyConcepts = []) {
    if (!text || !keyConcepts || keyConcepts.length === 0) {
        return { matched: [], missing: [], coverage: 1.0 };
    }
    
    const lowerText = text.toLowerCase();
    const studentTokens = tokenize(text);
    const studentTokenSet = new Set(studentTokens);
    
    const matched = [];
    const missing = [];
    
    for (const concept of keyConcepts) {
        const trimmed = concept.trim().toLowerCase();
        if (!trimmed) continue;
        
        // 1. Exact raw substring match
        if (lowerText.includes(trimmed)) {
            matched.push(concept.trim());
            continue;
        }
        
        // 2. Tokenized/canonical match
        const conceptTokens = tokenize(trimmed);
        const allPresent = conceptTokens.length > 0 && conceptTokens.every(t => studentTokenSet.has(t));
        if (allPresent) {
            matched.push(concept.trim());
            continue;
        }
        
        // 3. Sub-word partial token check for multi-word concept
        const words = trimmed.split(/\s+/).map(normalizeWord);
        const wordsPresent = words.length > 0 && words.every(w => studentTokens.includes(w));
        if (wordsPresent) {
            matched.push(concept.trim());
            continue;
        }
        
        missing.push(concept.trim());
    }
    
    const total = matched.length + missing.length;
    const coverage = total > 0 ? matched.length / total : 1.0;
    return { matched, missing, coverage };
}

/**
 * Offline Semantic Evaluation of a student short-answer
 * 
 * @param {string} studentAnswer - Text submitted by student
 * @param {string} referenceAnswer - Professor's ideal answer
 * @param {string[]} keyConcepts - Essential keywords/phrases
 * @returns {Object} detailed score, similarity, feedback, and concept matches
 */
export function evaluateShortAnswer(studentAnswer, referenceAnswer, keyConcepts = []) {
    if (!studentAnswer || studentAnswer.trim().length === 0) {
        return {
            score: 0.0,
            scoreOutOf20: '0.00',
            percentage: 0,
            similarity: 0.0,
            conceptCoverage: 0.0,
            matchedConcepts: [],
            missingConcepts: keyConcepts,
            feedback: 'No answer submitted.',
            rating: 'Unanswered'
        };
    }
    
    // Vectorize student answer + reference answer
    const { vectors } = vectorizeDocuments([studentAnswer, referenceAnswer]);
    const similarity = cosineSimilarity(vectors[0], vectors[1]);
    
    // Keyword coverage
    const conceptCheck = checkKeyConcepts(studentAnswer, keyConcepts);
    
    // Composite scoring formula:
    // 60% semantic similarity + 40% essential concept coverage
    const rawScore = keyConcepts.length > 0
        ? (0.60 * similarity) + (0.40 * conceptCheck.coverage)
        : similarity;
    
    // Soft thresholding & scaling to 20 points
    // When coverage and similarity are strong, scale up to reward deep conceptual grasp
    let normalized = Math.min(1.0, rawScore * 1.25);
    if (similarity < 0.15 && conceptCheck.coverage < 0.25) {
        normalized = 0.1; // Off-topic penalty
    }
    
    const score20 = Number((normalized * 20).toFixed(2));
    const percentage = Math.round(normalized * 100);
    
    // Qualitative Feedback Generation
    let feedback = '';
    let rating = '';
    
    if (percentage >= 85) {
        rating = 'Excellent';
        feedback = 'Outstanding grasp of the concept! Clear technical precision and accurate terminology.';
    } else if (percentage >= 70) {
        rating = 'Good';
        feedback = conceptCheck.missing.length > 0
            ? `Good explanation! To achieve full marks, also mention: "${conceptCheck.missing.slice(0, 2).join(', ')}".`
            : 'Solid understanding of the core mechanism.';
    } else if (percentage >= 50) {
        rating = 'Acceptable';
        feedback = 'Partial understanding demonstrated, but critical technical keywords or distinctions are missing.';
    } else {
        rating = 'Needs Improvement';
        feedback = conceptCheck.missing.length > 0
            ? `Misconception or off-topic answer. Key missing concepts: "${conceptCheck.missing.slice(0, 3).join(', ')}".`
            : 'The answer does not match the expected core concept.';
    }
    
    return {
        score: normalized,
        scoreOutOf20: score20.toFixed(2),
        percentage,
        similarity: Number(similarity.toFixed(3)),
        conceptCoverage: Number(conceptCheck.coverage.toFixed(2)),
        matchedConcepts: conceptCheck.matched,
        missingConcepts: conceptCheck.missing,
        feedback,
        rating
    };
}

/**
 * Cluster a list of student answers into 2-4 semantic concept groups
 * 
 * @param {Array<{ studentName: string, text: string }>} answersList
 * @param {string} referenceAnswer
 * @returns {Object} Semantic Clusters with percentages, exemplars, and common keywords
 */
export function clusterAnswers(answersList, referenceAnswer = '') {
    if (!Array.isArray(answersList) || answersList.length === 0) {
        return {
            totalAnswers: 0,
            clusters: [],
            topKeywords: []
        };
    }
    
    const docs = [...answersList.map(a => a.text), referenceAnswer].filter(Boolean);
    const { vectors, vocab } = vectorizeDocuments(docs);
    
    const studentVectors = vectors.slice(0, answersList.length);
    const refVector = referenceAnswer ? vectors[vectors.length - 1] : null;
    
    // Evaluate individual scores against reference to categorize into clusters
    const categorized = {
        mastery: {
            id: 'mastery',
            label: 'Accurate Conceptual Definition (Mastery)',
            color: '#10b981', // Emerald green
            answers: []
        },
        misconception: {
            id: 'misconception',
            label: 'Partial Understanding / Concept Confusion',
            color: '#f59e0b', // Amber
            answers: []
        },
        incomplete: {
            id: 'incomplete',
            label: 'Incomplete / Off-Topic Responses',
            color: '#ef4444', // Red
            answers: []
        }
    };
    
    answersList.forEach((ans, i) => {
        let sim = refVector ? cosineSimilarity(studentVectors[i], refVector) : 0.5;
        const textLen = (ans.text || '').trim().split(/\s+/).filter(Boolean).length;
        
        if (sim >= 0.35) {
            categorized.mastery.answers.push({ ...ans, similarity: sim });
        } else if (sim >= 0.05 && textLen >= 3) {
            categorized.misconception.answers.push({ ...ans, similarity: sim });
        } else {
            categorized.incomplete.answers.push({ ...ans, similarity: sim });
        }
    });
    
    const total = answersList.length;
    let clusters = Object.values(categorized).map(cat => {
        const count = cat.answers.length;
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
        
        // Find best exemplar (highest similarity or middle length)
        let exemplar = 'No submissions in this cluster.';
        if (cat.answers.length > 0) {
            const sorted = [...cat.answers].sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
            exemplar = sorted[0].text;
        }
        
        // Extract common keywords for this cluster
        const clusterText = cat.answers.map(a => a.text).join(' ');
        const tokens = tokenize(clusterText, false);
        const freq = {};
        tokens.forEach(t => freq[t] = (freq[t] || 0) + 1);
        const topWords = Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([word]) => word);
        
        return {
            id: cat.id,
            label: cat.label,
            color: cat.color,
            count,
            percentage,
            exemplar,
            topWords,
            studentNames: cat.answers.map(a => a.studentName || 'Student').slice(0, 5)
        };
    }).filter(c => c.count > 0 || total === 0);
    
    // Overall top keywords across entire class
    const allTokens = tokenize(answersList.map(a => a.text).join(' '), false);
    const overallFreq = {};
    allTokens.forEach(t => overallFreq[t] = (overallFreq[t] || 0) + 1);
    const topKeywords = Object.entries(overallFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([w, c]) => ({ word: w, count: c }));
    
    return {
        totalAnswers: total,
        clusters,
        topKeywords
    };
}
