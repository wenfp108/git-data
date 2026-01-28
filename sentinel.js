const { Octokit } = require("@octokit/rest");

const CONFIG = {
    owner: process.env.REPO_OWNER,
    repo: process.env.REPO_NAME,
    token: process.env.GITHUB_TOKEN
};

const octokit = new Octokit({ auth: CONFIG.token });

// --- 🧠 科技之神策略引擎 (Tech Masters) ---
const TECH_MASTERS = {
    // [安德森] 加速主义：锁定 AGI 基础设施与重工业框架
    ANDREESSEN: (repo) => {
        const text = (repo.name + " " + (repo.description || "")).toLowerCase();
        return (text.match(/agi|infra|llm|cuda|compiler|quantization|tensor/i)) ? 'TECH_ACCELERATOR' : null;
    },
    // [托瓦兹] 务实主义：锁定底层系统、Rust/C 创新与高性能引擎
    TORVALDS: (repo) => {
        const isHardcore = ['Rust', 'C', 'C++', 'Zig'].includes(repo.language);
        const text = (repo.description || "").toLowerCase();
        return (isHardcore && text.match(/kernel|driver|runtime|engine|embedded|performance/i)) ? 'CORE_PRAGMATISM' : null;
    },
    // [纳瓦尔] 杠杆哲学：锁定协议级、API 优先、无许可 Agent 工具
    NAVAL: (repo) => {
        const text = (repo.description || "").toLowerCase();
        return (text.match(/protocol|sdk|api-first|autonomous|agent|permissionless/i) && repo.forks > 30) ? 'CODE_LEVERAGE' : null;
    },
    // [格雷厄姆] 范式转移：锁定试图“重新定义”现有问题的早期项目
    GRAHAM: (repo) => {
        const text = (repo.description || "").toLowerCase();
        return (text.match(/reimagining|alternative to|solving the problem of|new way/i) && repo.stargazers_count > 100) ? 'PARADIGM_SHIFT' : null;
    }
};

async function run() {
    try {
        // ✨ 动态计算：锁定过去 24 小时的全球代码异动
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const query = `stars:>50 created:>=${yesterday}`;
        
        console.log(`📡 [Sentinel] 正在侦察: ${query}`);
        const { data } = await octokit.search.repos({
            q: query, sort: 'stars', order: 'desc', per_page: 50
        });

        const signals = data.items.map(repo => {
            const text = (repo.name + " " + (repo.description || "")).toLowerCase();
            // 自动化噪音清洗：剔除列表与资源库
            if (['awesome', 'roadmap', 'interview', 'list', 'tutorial', 'collection'].some(w => text.includes(w))) return null;

            const tags = [];
            for (const [name, logic] of Object.entries(TECH_MASTERS)) {
                const tag = logic(repo);
                if (tag) tags.push(tag);
            }
            return tags.length > 0 ? {
                full_name: repo.full_name,
                description: repo.description,
                url: repo.html_url,
                language: repo.language,
                stars: repo.stargazers_count,
                strategy_tags: tags,
                scanned_at: new Date().toISOString()
            } : null;
        }).filter(r => r !== null);

        if (signals.length > 0) {
            const now = new Date();
            const path = `data/tech/${now.toISOString().split('T')[0]}/sentinel-${now.getHours()}h.json`;
            await octokit.repos.createOrUpdateFileContents({
                owner: CONFIG.owner,
                repo: CONFIG.repo,
                path: path,
                message: `🤖 Sentinel Insight: Found ${signals.length} Tech Signals`,
                content: Buffer.from(JSON.stringify(signals, null, 2)).toString('base64')
            });
            console.log(`✅ 成功捕获 ${signals.length} 条硬核科技信号 -> ${path}`);
        } else {
            console.log("⚠️ 本次巡逻未发现符合大师逻辑的显著波动。");
        }
    } catch (e) { console.error("❌ 运行异常:", e.message); }
}
run();
