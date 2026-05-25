const fs = require('fs');
const p = 'c:/Users/abdel/Downloads/DATAFYRA/src/app/pages/editor/editor.css';
let content = fs.readFileSync(p, 'utf8');

const target = `.editor-sidebar-left {
  border-right: 1px solid #e6e2ef;
  display: flex;
  flex-direction: column;
}`;
const targetWin = target.replace(/\n/g, '\r\n');

const replacement = `.editor-sidebar-left {
  border-right: 1px solid #e2e8f0;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
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
