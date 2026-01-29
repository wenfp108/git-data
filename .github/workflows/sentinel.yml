const fs = require('fs');
const path = require('path');

async function archiveGitData() {
    const today = new Date().toISOString().split('T')[0];
    const ROOT = process.cwd();
    const LOCAL_DATA = path.resolve(ROOT, 'data');
    const BANK_ROOT = path.resolve(ROOT, 'central_bank');

    console.log(`📅 启动收割程序: ${today}`);

    // 🌟 修正：匹配你实际生成的 data/tech 路径
    const targets = [
        { local: 'tech', bank: 'github/tech' }
    ];

    // 1. 搬运资产
    targets.forEach(t => {
        const sourcePath = path.join(LOCAL_DATA, t.local, today);
        const targetPath = path.join(BANK_ROOT, t.bank, today);

        if (fs.existsSync(sourcePath)) {
            const files = fs.readdirSync(sourcePath).filter(f => f.endsWith('.json'));
            if (files.length > 0) {
                if (!fs.existsSync(targetPath)) fs.mkdirSync(targetPath, { recursive: true });
                files.forEach(file => {
                    const srcFile = path.join(sourcePath, file);
                    const destFile = path.join(targetPath, file);
                    fs.copyFileSync(srcFile, destFile);
                    console.log(`✅ [${t.local}] 已搬运: ${file}`);
                });
            }
        }
    });

    // 2. 强制焚毁本地空层级（只保留 data/ 下的 .git 占位符）
    console.log("🔥 正在清理前线战场...");
    if (fs.existsSync(LOCAL_DATA)) {
        const items = fs.readdirSync(LOCAL_DATA);
        items.forEach(item => {
            if (item.startsWith('.git')) return; 

            const itemPath = path.join(LOCAL_DATA, item);
            try {
                fs.rmSync(itemPath, { recursive: true, force: true });
                console.log(`🗑️ 已彻底删除: ${item}`);
            } catch (err) {
                console.error(`❌ 清理失败 ${item}:`, err);
            }
        });
    }
}

archiveGitData().catch(console.error);
