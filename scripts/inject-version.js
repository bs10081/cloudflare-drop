const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 獲取 Git commit hash
const commitHash = execSync('git rev-parse HEAD').toString().trim();

// 獲取當前時間
const buildTime = new Date().toISOString();

// 讀取版本檔案
const versionPath = path.join(__dirname, '../dist/version.js');
let content = fs.readFileSync(versionPath, 'utf8');

// 替換佔位符
content = content.replace('__BUILD_TIME__', buildTime);
content = content.replace('__COMMIT_HASH__', commitHash);

// 寫回檔案
fs.writeFileSync(versionPath, content); 