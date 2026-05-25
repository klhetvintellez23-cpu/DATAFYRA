const fs = require('fs');
const p = 'c:/Users/abdel/Downloads/DATAFYRA/src/app/pages/editor/editor.css';
let content = fs.readFileSync(p, 'utf8');

const target1 = `.page-thumb-line,
.page-thumb-block {
  border-radius: 999px;
  background: #a5c973;
}`;

const replacement1 = `.page-thumb-line,
.page-thumb-block {
  border-radius: 999px;
  background: #c4b5fd;
}`;

const target2 = `.page-thumb-block {
  height: 28px;
  border-radius: 5px;
  background: #d9e6c3;
}`;

const replacement2 = `.page-thumb-block {
  height: 28px;
  border-radius: 5px;
  background: #ede9fe;
}`;

const target3 = `.page-thumb-welcome,
.page-thumb-end {
  place-items: center;
  color: #4f46e5;
  background: #f9fafb;
}`;

const replacement3 = `.page-thumb-welcome,
.page-thumb-end {
  place-items: center;
  color: #7c3aed;
  background: #f8fafc;
}`;

const target4 = `.page-thumb {
  width: 72px;
  height: 78px;
  margin-left: 10px;
  display: grid;
  align-content: center;
  gap: 6px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #f9fafb;
}`;

const replacement4 = `.page-thumb {
  width: 68px;
  height: 74px;
  margin-left: 12px;
  display: grid;
  align-content: center;
  gap: 6px;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
}`;

function replaceTarget(t, r) {
  if (content.includes(t)) {
    content = content.replace(t, r);
  } else if (content.includes(t.replace(/\n/g, '\r\n'))) {
    content = content.replace(t.replace(/\n/g, '\r\n'), r);
  }
}

replaceTarget(target1, replacement1);
replaceTarget(target2, replacement2);
replaceTarget(target3, replacement3);
replaceTarget(target4, replacement4);

fs.writeFileSync(p, content);
console.log('Replaced thumb colors');
