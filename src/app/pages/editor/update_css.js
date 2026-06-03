const fs = require('fs');
const path = 'c:/Users/klhet/dataencuesta/src/app/pages/editor/editor-share-results.css';

const cssToAdd = `
/* --- Analytics Grid Layouts --- */

.analytics-selection-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  padding: 8px 0;
}

.analytics-feed-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
  align-items: start;
}

.shadcn-dialog-content {
  /* Override default max-width for the analytics modal if needed */
  transition: max-width 0.2s ease;
}

.checklist-indicator {
  font-variation-settings: 'FILL' 1;
}

.shadcn-menu-item {
  position: relative;
}

.shadcn-menu-item.active {
  border-color: #6d28d9;
  background-color: #f5f3ff;
}

.shadcn-menu-item.active strong {
  color: #6d28d9;
}
`;

fs.appendFileSync(path, cssToAdd);
console.log('CSS appended successfully.');
