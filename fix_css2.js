const fs = require('fs');
const p = 'c:/Users/abdel/Downloads/DATAFYRA/src/app/pages/editor/editor.css';
let content = fs.readFileSync(p, 'utf8');

const target = `.builder-sidebar-heading {
  min-height: 58px;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e5e7eb;
}

.builder-sidebar-heading h2 {
  margin: 0;
  color: #111827;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0;
}`;
const targetWin = target.replace(/\n/g, '\r\n');

const replacement = `.builder-sidebar-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.builder-sidebar-heading h2 {
  margin: 0;
  color: #0f172a;
  font-size: 18px;
  font-weight: 800;
}`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(p, content);
  console.log('Replaced LF');
} else if (content.includes(targetWin)) {
  content = content.replace(targetWin, replacement);
  fs.writeFileSync(p, content);
  console.log('Replaced CRLF');
} else {
  console.log('Target not found');
}
