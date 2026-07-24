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
        fs.cpSync(srcPath, destPath);
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