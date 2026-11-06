const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const srcDir = __dirname;

// Possible destination directories for anx.io.vn
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

console.log('================================================================');
console.log('✦ ĐỒNG BỘ SONG SONG TỪ TÙNG KINH (tungkinh) SANG ANX.IO.VN ✦');
console.log('• Nguồn (Source):    ', srcDir);
console.log('• Đích (Destination):', destDir);
console.log('================================================================');

// 0. Ensure fresh build before copying
try {
  console.log('[1/4] Biên dịch gói giao diện và âm thanh mới nhất (npm run build)...');
  execSync('npm run build', { cwd: srcDir, stdio: 'inherit' });
} catch (e) {
  console.warn('[Cảnh báo] Lỗi biên dịch build:', e.message);
}

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
console.log('[2/4] Sao chép toàn bộ css, dist, js, nhac sang Website_thoitiet_design...');
copyDir(path.join(srcDir, 'css'), path.join(destDir, 'css'));
copyDir(path.join(srcDir, 'dist'), path.join(destDir, 'dist'));
copyDir(path.join(srcDir, 'js'), path.join(destDir, 'js'));
copyDir(path.join(srcDir, 'nhac'), path.join(destDir, 'nhac'));

// 2. Prepare and copy index.html with base tag
let html = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
if (!html.includes('<base href="/tung-kinh/">')) {
  html = html.replace('<head>', '<head>\n  <base href="/tung-kinh/">');
}
fs.writeFileSync(path.join(destDir, 'index.html'), html, 'utf8');
console.log('✓ Đã sao chép 100% dữ liệu sang:', destDir);

// 3. Auto commit & push to Website_thoitiet_design (anx.io.vn)
const websiteRepoDir = path.resolve(destDir, '../../');
if (fs.existsSync(path.join(websiteRepoDir, '.git'))) {
  console.log('[3/4] Phát hiện Git repository của anx.io.vn tại:', websiteRepoDir);
  try {
    // Get current commit hash of tungkinh
    let currentCommit = 'latest';
    try {
      currentCommit = execSync('git rev-parse --short HEAD', { cwd: srcDir }).toString().trim();
    } catch (_) {}

    // Pull rebase first to keep clean history
    try {
      execSync('git pull --rebase origin main', { cwd: websiteRepoDir, stdio: 'ignore' });
    } catch (_) {}

    console.log('[4/4] Đẩy code cập nhật lên GitHub anx.io.vn (Website_thoitiet_design)...');
    execSync('git add public/tung-kinh .github/workflows/deploy.yml', { cwd: websiteRepoDir, stdio: 'inherit' });
    
    const status = execSync('git status --porcelain', { cwd: websiteRepoDir }).toString();
    if (status.trim()) {
      const commitMsg = `feat(tung-kinh): auto-sync parallel from tungkinh commit ${currentCommit}`;
      execSync(`git commit -m "${commitMsg}"`, { cwd: websiteRepoDir, stdio: 'inherit' });
      execSync('git push origin main', { cwd: websiteRepoDir, stdio: 'inherit' });
      console.log('================================================================');
      console.log('>>> THÀNH CÔNG: ĐÃ ĐỒNG BỘ VÀ ĐẨY LÊN https://anx.io.vn/tung-kinh/ <<<');
      console.log('================================================================');
    } else {
      console.log('✓ Website_thoitiet_design đã ở trạng thái đồng bộ mới nhất.');
    }
  } catch (err) {
    console.warn('[Lưu ý] Tiến trình Git sync sang Website_thoitiet_design:', err.message);
  }
}
