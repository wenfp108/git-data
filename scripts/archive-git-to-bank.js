const fs = require('fs');
const path = require('path');

/**
 * GitHub Sentinel 归档脚本：将本地生成的技术趋势 JSON 搬运至中央银行
 */
async function archiveGitData() {
    // 统一使用北京时间生成日期标签，与 sentinel.js 保持一致
    const bjTime = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const dateStr = bjTime.toISOString().split('T')[0];
    
    const ROOT = process.cwd();
    // 对应 sentinel.js 生成数据的原始路径
    const LOCAL_DATA_ROOT = path.join(ROOT, 'data', 'tech', dateStr);
    // 对应 YAML 中的 path: central_bank，目标定位于 GitHub/tech 分类
    const BANK_TARGET_ROOT = path.join(ROOT, 'central_bank', 'GitHub', 'tech', dateStr);

    console.log(`📅 开始技术情报归档判定: ${dateStr}`);

    if (fs.existsSync(LOCAL_DATA_ROOT)) {
        const files = fs.readdirSync(LOCAL_DATA_ROOT).filter(f => f.endsWith('.json'));
        
        if (files.length > 0) {
            // 确保中央银行的目标日期目录存在
            if (!fs.existsSync(BANK_TARGET_ROOT)) {
                fs.mkdirSync(BANK_TARGET_ROOT, { recursive: true });
            }

            files.forEach(file => {
                const src = path.join(LOCAL_DATA_ROOT, file);
                const dest = path.join(BANK_TARGET_ROOT, file);
                
                console.log(`🚚 正在搬运: ${file} -> GitHub/tech/${dateStr}/`);
                fs.copyFileSync(src, dest);
                
                // 物理确认：目的地存在文件后才清理前线仓库
                if (fs.existsSync(dest)) {
                    fs.unlinkSync(src);
                    console.log(`✅ 已存入金库并清理本地: ${file}`);
                }
            });
        } else {
            console.log("📭 本地无待归档文件。");
        }
    } else {
        console.log(`⚠️ 未发现今日数据目录: ${LOCAL_DATA_ROOT}`);
    }
}

archiveGitData().catch(console.error);
