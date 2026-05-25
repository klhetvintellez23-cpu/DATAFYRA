const fs = require('fs');
const p = 'c:/Users/abdel/Downloads/DATAFYRA/src/app/pages/editor/editor.css';
let content = fs.readFileSync(p, 'utf8');

const target = `.custom-panel-header {
  padding: 12px 16px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 10;
}`;
const targetWin = target.replace(/\n/g, '\r\n');

const replacement = `.custom-panel-header {
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

.custom-panel-eyebrow {
  display: block;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #7c3aed;
  margin-bottom: 4px;
}

.custom-panel-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 0;
  background: #f1f5f9;
  color: #64748b;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.custom-panel-close:hover {
  background: #e2e8f0;
  color: #0f172a;
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
