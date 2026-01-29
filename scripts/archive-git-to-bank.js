import fs from 'fs';
import path from 'path';
import process from 'process';

async function archiveGitData() {
    const ROOT = process.cwd();
    const LOCAL_DATA = path.resolve(ROOT, 'data');
    const BANK_ROOT = path.resolve(ROOT, 'central_bank');

    console.log(`📅 启动收割程序...`);

    // 定义要搬运的业务线 (目前只有 tech，未来可以加 crypto, news 等)
    const targets = [
        { local: 'tech', bank: 'github/tech' }
    ];

    // 1. 搬运资产 (修改为：自动扫描目录，不再猜测日期)
    targets.forEach(t => {
        const localCategoryPath = path.join(LOCAL_DATA, t.local);
        const bankCategoryPath = path.join(BANK_ROOT, t.bank);

        // 如果本地存在该分类目录 (例如 data/tech)
        if (fs.existsSync(localCategoryPath)) {
            // 获取该分类下所有的日期文件夹 (e.g. ['2026-01-30', '2026-01-31'])
            // 过滤掉 .DS_Store 或非文件夹项
            const dateFolders = fs.readdirSync(localCategoryPath).filter(f => {
                const fullPath = path.join(localCategoryPath, f);
                return fs.statSync(fullPath).isDirectory();
            });

            dateFolders.forEach(dateFolder => {
                const sourcePath = path.join(localCategoryPath, dateFolder);
                const targetPath = path.join(bankCategoryPath, dateFolder);
                
                const files = fs.readdirSync(sourcePath).filter(f => f.endsWith('.json'));
                
                if (files.length > 0) {
                    // 确保央行对应的日期目录存在
                    if (!fs.existsSync(targetPath)) {
                        fs.mkdirSync(targetPath, { recursive: true });
                    }

                    files.forEach(file => {
                        const srcFile = path.join(sourcePath, file);
                        const destFile = path.join(targetPath, file);
                        
                        // 复制文件 (如果目标已存在则覆盖，保证是最新的)
                        fs.copyFileSync(srcFile, destFile);
                        console.log(`✅ [${t.local}/${dateFolder}] 已搬运: ${file}`);
                    });
                }
            });
        }
    });

    // 2. 强制焚毁前线战场 (逻辑不变：只有在确保搬运逻辑是“扫描式”的，这里才安全)
    console.log("🔥 正在清理前线战场...");
    if (fs.existsSync(LOCAL_DATA)) {
        const items = fs.readdirSync(LOCAL_DATA);
        items.forEach(item => {
            // 保留 .gitkeep 或 .git 文件夹（如果有的话），防止空提交报错
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
