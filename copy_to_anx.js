const fs = require('fs');
const path = require('path');

const srcDir = 'e:/Python/tungkinh';
const destDir = 'E:/Python/quan-ly-tien-phong-22h48/quan-ly-tien-phong-22h48/Website_thoitiet_design/public/tung-kinh';

function copyDir(src, dest) {
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

copyDir(path.join(srcDir, 'css'), path.join(destDir, 'css'));
copyDir(path.join(srcDir, 'dist'), path.join(destDir, 'dist'));
copyDir(path.join(srcDir, 'js'), path.join(destDir, 'js'));

let html = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
if (!html.includes('<base href="/tung-kinh/">')) {
  html = html.replace('<head>', '<head>\n  <base href="/tung-kinh/">');
}
fs.writeFileSync(path.join(destDir, 'index.html'), html, 'utf8');

console.log('Successfully copied all files with clean UTF-8 encoding to:', destDir);
