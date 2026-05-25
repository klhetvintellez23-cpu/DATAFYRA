const fs = require('fs');
const p = 'c:/Users/abdel/Downloads/DATAFYRA/src/app/pages/editor/editor.css';
let content = fs.readFileSync(p, 'utf8');

const target = `.builder-page-item {
  min-height: 112px;
  padding: 0;
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  color: #374151;
  overflow: hidden;
}`;
const targetWin = target.replace(/\n/g, '\r\n');

const replacement = `.builder-page-item {
  min-height: 100px;
  padding: 0;
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  color: #0f172a;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.builder-page-item:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transform: translateY(-1px);
}

.builder-page-item.active {
  border-color: #7c3aed;
  box-shadow: 0 0 0 1px #7c3aed, 0 4px 12px rgba(124, 58, 237, 0.1);
  background: #faf5ff;
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
