const fs = require('fs');
const path = require('path');

// Folders and files to copy to dist
const INCLUDE = [
    'index.html',
    'login.html',
    'admin.html',
    'style.css',
    'renderer.js',
    'auth-config.js',
    'auth-guard.js',
    'user-bar.js',
    'topic-read-tracker.js',
    'mcq_with_explation.json',
    'assets',
    'pages',
];

const SRC = __dirname;
const DIST = path.join(__dirname, 'dist');

// Clean dist
if (fs.existsSync(DIST)) {
    fs.rmSync(DIST, { recursive: true, force: true });
    console.log('Cleaned dist/');
}
fs.mkdirSync(DIST);

// Copy function (recursive)
function copyItem(srcPath, destPath) {
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        for (const child of fs.readdirSync(srcPath)) {
            copyItem(path.join(srcPath, child), path.join(destPath, child));
        }
    } else {
        let content = fs.readFileSync(srcPath);
        const isLessonPage = path.dirname(srcPath).startsWith(path.join(SRC, 'pages')) && path.extname(srcPath).toLowerCase() === '.html';
        if (isLessonPage && !content.toString().includes('topic-read-tracker.js')) {
            content = Buffer.from(content.toString().replace('</head>', '    <script src="/auth-config.js"></script>\n    <script src="/topic-read-tracker.js"></script>\n</head>'));
        }
        fs.writeFileSync(destPath, content);
    }
}

// Run
let count = 0;
for (const item of INCLUDE) {
    const srcPath = path.join(SRC, item);
    const destPath = path.join(DIST, item);
    if (fs.existsSync(srcPath)) {
        copyItem(srcPath, destPath);
        console.log(`Copied: ${item}`);
        count++;
    } else {
        console.warn(`Skipped (not found): ${item}`);
    }
}

console.log(`\nBuild complete — ${count} items copied to dist/`);