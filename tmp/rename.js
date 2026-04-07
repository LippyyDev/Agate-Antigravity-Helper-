const fs = require('fs');
const path = require('path');

const filePaths = [
  'package.json',
  'index.html',
  'forge.config.ts',
  'src/utils/security.ts',
  'src/utils/autoStart.ts',
  'src/tests/unit/process.test.ts',
  'src/tests/e2e/app.spec.ts',
  'src/localization/i18n.ts',
  'src/ipc/tray/handler.ts',
  'src/ipc/process/handler.ts',
  'src/ipc/cloud/authServer.ts',
  'src/instrument.ts'
];

filePaths.forEach(file => {
  const absolutePath = path.resolve(file);
  if (fs.existsSync(absolutePath)) {
    let content = fs.readFileSync(absolutePath, 'utf8');
    
    // Replace Antigravity Manager
    content = content.replace(/Antigravity Manager/g, 'Antigravity Helper');
    
    // Replace antigravity-manager to antigravity-helper ONLY in package.json and non-URL contexts
    if (file === 'package.json' || file === 'src/ipc/process/handler.ts' || file === 'src/utils/autoStart.ts' || file === 'src/instrument.ts' || file === 'forge.config.ts') {
       content = content.replace(/"name":\s*"antigravity-manager"/g, '"name": "antigravity-helper"');
       content = content.replace(/antigravity-manager/g, 'antigravity-helper');
    }
    
    // Specific replacement for AntigravityManager in code, but NOT in URLs like github.com/Draculabo/AntigravityManager
    content = content.replace(/(?<!Draculabo\/)AntigravityManager/g, 'AntigravityHelper');

    fs.writeFileSync(absolutePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});

// For package-lock.json (we can just npm i after renaming package.json)
