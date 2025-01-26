const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 獲取 Wrangler 版本號
const wranglerVersion = execSync('wrangler --version').toString().trim().split(' ')[1];

// 獲取當前時間
const buildTime = new Date().toISOString();

// 讀取版本檔案
const versionPath = path.join(__dirname, '../web/dist/version.js');
let content = fs.readFileSync(versionPath, 'utf8');

// 替換佔位符
content = content.replace('__BUILD_TIME__', buildTime);
content = content.replace('__COMMIT_HASH__', wranglerVersion);

// 寫回檔案
fs.writeFileSync(versionPath, content); 