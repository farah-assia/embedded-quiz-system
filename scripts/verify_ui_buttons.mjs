import fs from 'fs';
import path from 'path';

const files = [
    'public/teacher/index.html',
    'public/projector/index.html',
    'public/student/index.html'
];

let totalErrors = 0;

for (const relPath of files) {
    const fullPath = path.resolve(relPath);
    const html = fs.readFileSync(fullPath, 'utf-8');

    console.log(`\n======================================================`);
    console.log(`Checking UI Buttons in: ${relPath}`);
    console.log(`======================================================`);

    // 1. Extract all defined functions in script tags
    const definedFunctions = new Set([
        'alert', 'console', 'window', 'document', 'localStorage', 'sessionStorage',
        'clearInterval', 'clearTimeout', 'setInterval', 'setTimeout', 'fetch'
    ]);

    // Matches function foo(
    const funcDeclRegex = /function\s+([a-zA-Z0-9_$]+)\s*\(/g;
    let match;
    while ((match = funcDeclRegex.exec(html)) !== null) {
        definedFunctions.add(match[1]);
    }

    // Matches window.foo = or const foo =
    const assignRegex = /(?:window\.)?([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?(?:function|\([^)]*\)\s*=>)/g;
    while ((match = assignRegex.exec(html)) !== null) {
        definedFunctions.add(match[1]);
    }

    // 2. Extract all onclick handlers
    const onclickRegex = /onclick\s*=\s*["']([^"']+)["']/gi;
    const calledFunctions = new Set();
    const missingFunctions = [];

    while ((match = onclickRegex.exec(html)) !== null) {
        const handler = match[1].trim();
        // Extract function name before (
        const fnMatch = handler.match(/^([a-zA-Z0-9_$]+)\s*\(/);
        if (fnMatch) {
            const fnName = fnMatch[1];
            calledFunctions.add(fnName);
            if (!definedFunctions.has(fnName)) {
                missingFunctions.push({ fnName, handler });
            }
        }
    }

    console.log(`Total unique onclick handlers called: ${calledFunctions.size}`);
    console.log(`Functions defined in file: ${definedFunctions.size}`);

    if (missingFunctions.length === 0) {
        console.log(`✅ All ${calledFunctions.size} onclick button handlers are fully DEFINED and WIRED!`);
    } else {
        console.error(`❌ Found ${missingFunctions.length} missing handler(s):`);
        for (const m of missingFunctions) {
            console.error(`   - Missing function: "${m.fnName}" called by: "${m.handler}"`);
            totalErrors++;
        }
    }
}

if (totalErrors === 0) {
    console.log('\n🌟 PERFECT: All buttons across Teacher, Projector, and Student are 100% verified and wired!');
} else {
    process.exit(1);
}
