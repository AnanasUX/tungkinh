const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const srcDir = __dirname;

// Possible destination directories
const candidateDirs = [
  'D:/Downloads_Phanmem/Chrome/quan-ly-tien-phong-22h48/Website_thoitiet_design/public/tung-kinh',
  'E:/Downloads_Phanmem/Chrome/quan-ly-tien-phong-22h48/Website_thoitiet_design/public/tung-kinh',
  'E:/Python/quan-ly-tien-phong-22h48/quan-ly-tien-phong-22h48/Website_thoitiet_design/public/tung-kinh',
  'E:/AnannasUX/Python/website/quan-ly-tien-phong/website/public/tung-kinh'
];

let destDir = candidateDirs.find(d => fs.existsSync(path.dirname(d)));
if (!destDir) {
  destDir = candidateDirs[0];
}

console.log('Source Directory:', srcDir);
console.log('Target Destination for anx.io.vn:', destDir);

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 1. Copy assets
console.log('Copying css...');
copyDir(path.join(srcDir, 'css'), path.join(destDir, 'css'));

console.log('Copying dist...');
copyDir(path.join(srcDir, 'dist'), path.join(destDir, 'dist'));

console.log('Copying js...');
copyDir(path.join(srcDir, 'js'), path.join(destDir, 'js'));

console.log('Copying nhac...');
copyDir(path.join(srcDir, 'nhac'), path.join(destDir, 'nhac'));

// 2. Prepare and copy index.html with base tag
let html = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
if (!html.includes('<base href="/tung-kinh/">')) {
  html = html.replace('<head>', '<head>\n  <base href="/tung-kinh/">');
}
fs.writeFileSync(path.join(destDir, 'index.html'), html, 'utf8');
console.log('Successfully copied all assets to:', destDir);

// 3. Auto commit & push to Website_thoitiet_design (anx.io.vn)
const websiteRepoDir = path.resolve(destDir, '../../');
if (fs.existsSync(path.join(websiteRepoDir, '.git'))) {
  console.log('Detected git repository for anx.io.vn at:', websiteRepoDir);
  try {
    console.log('Staging changes in Website_thoitiet_design...');
    execSync('git add public/tung-kinh', { cwd: websiteRepoDir, stdio: 'inherit' });
    
    const status = execSync('git status --porcelain', { cwd: websiteRepoDir }).toString();
    if (status.trim()) {
      console.log('Committing changes for anx.io.vn...');
      execSync('git commit -m "feat(tung-kinh): sync 100% UI, UX, audio & auto-play fixes from tungkinh repo"', { cwd: websiteRepoDir, stdio: 'inherit' });
      console.log('Pushing to GitHub (anx.io.vn)...');
      execSync('git push origin main', { cwd: websiteRepoDir, stdio: 'inherit' });
      console.log('>>> DEPLOYED TO anx.io.vn SUCCESSFULLY! <<<');
    } else {
      console.log('No new changes to commit in Website_thoitiet_design.');
    }
  } catch (err) {
    console.warn('Git sync to Website_thoitiet_design notice:', err.message);
  }
}
