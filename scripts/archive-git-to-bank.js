import fs from 'fs';
import path from 'path';
import process from 'process';

async function archiveGitData() {
    const ROOT = process.cwd();
    const LOCAL_DATA = path.resolve(ROOT, 'data');
    const BANK_ROOT = path.resolve(ROOT, 'central_bank');

    console.log(`📅 启动收割程序...`);

    // 定义要搬运的业务线
    const targets = [
        // 1. GitHub 代码情报 -> 存入央行 github/tech
        { local: 'tech', bank: 'github/tech' },
        
        // 2. 论文前沿情报 -> 存入央行 papers/global (✅ 新增路线)
        { local: 'papers', bank: 'papers/global' }
    ];

    // 1. 搬运资产
    targets.forEach(t => {
        const localCategoryPath = path.join(LOCAL_DATA, t.local);
        const bankCategoryPath = path.join(BANK_ROOT, t.bank);

        // 如果本地存在该分类目录
        if (fs.existsSync(localCategoryPath)) {
            // 获取该分类下所有的日期文件夹
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
                        
                        // 复制文件 (覆盖模式)
                        fs.copyFileSync(srcFile, destFile);
                        console.log(`✅ [${t.local}/${dateFolder}] 已搬运: ${file}`);
                    });
                }
            });
        }
    });

    // 2. 强制焚毁前线战场
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
