const fs = require('fs');
const p = 'c:/Users/abdel/Downloads/DATAFYRA/src/app/pages/editor/editor.css';
let content = fs.readFileSync(p, 'utf8');

const target1 = `.page-row-actions button {
  width: 26px;
  height: 26px;
}`;

const replacement1 = `.page-row-actions button {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: transparent;
  color: #64748b;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.page-row-actions button:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.page-row-actions button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  background: transparent;
}

.page-row-actions button.page-action-danger:hover {
  background: #fef2f2;
  color: #ef4444;
}`;

function replaceTarget(t, r) {
  if (content.includes(t)) {
    content = content.replace(t, r);
  } else if (content.includes(t.replace(/\n/g, '\r\n'))) {
    content = content.replace(t.replace(/\n/g, '\r\n'), r);
  }
}

replaceTarget(target1, replacement1);

fs.writeFileSync(p, content);
console.log('Replaced page row actions');
