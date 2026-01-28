const { Octokit } = require("@octokit/rest");

const CONFIG = {
    owner: process.env.REPO_OWNER,
    repo: process.env.REPO_NAME,
    token: process.env.GITHUB_TOKEN
};

const octokit = new Octokit({ auth: CONFIG.token });

// --- 🧠 1. 硬核科技策略 (Tech Masters) ---
// 针对：代码、基础设施、协议、底层优化
const TECH_MASTERS = {
    ANDREESSEN: (text, repo) => (text.match(/agi|infra|llm|cuda|compiler|quantization|tensor|gpu/i)) ? 'TECH_ACCELERATOR' : null,
    TORVALDS: (text, repo) => {
        const isHardcore = ['Rust', 'C', 'C++', 'Zig'].includes(repo.language);
        return (isHardcore && text.match(/kernel|driver|runtime|engine|embedded|performance/i)) ? 'CORE_PRAGMATISM' : null;
    },
    NAVAL: (text, repo) => (text.match(/protocol|sdk|api-first|autonomous|agent|permissionless|defi/i) && repo.forks > 20) ? 'CODE_LEVERAGE' : null,
    GRAHAM: (text, repo) => (text.match(/reimagining|alternative to|solving the problem of|new way|vs code/i)) ? 'PARADIGM_SHIFT' : null
};

// --- 🎓 2. 人才风向策略 (Talent Flow) ---
// 针对：学习资料、面试题、技能树、资源列表
// 你的要求：人才留住，看他们在学什么
const TALENT_MASTERS = {
    SKILLS: (text) => (text.match(/skills|roadmap|path|learning|guide|101/i)) ? 'TALENT_GROWTH' : null,
    INTERVIEW: (text) => (text.match(/interview|questions|leetcode|offer/i)) ? 'CAREER_MOVES' : null,
    RESOURCE: (text) => (text.match(/awesome|collection|list|curated|resources|template/i)) ? 'KNOWLEDGE_BASE' : null
};

async function run() {
    console.log("🚀 Sentinel 全频谱侦察启动...");
    try {
        // 动态计算日期：过去 24 小时
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        // 搜索门槛：Stars > 50 (保证是有一定热度的)
        const query = `stars:>50 created:>=${yesterday}`;
        console.log(`📡 搜索指令: ${query}`);

        const { data } = await octokit.search.repos({
            q: query, sort: 'stars', order: 'desc', per_page: 50
        });

        // 📊 统计计数器 (用于回答"目前的主流是什么")
        const stats = {}; 

        const signals = data.items.map(repo => {
            const text = (repo.name + " " + (repo.description || "")).toLowerCase();
            const tags = [];

            // 1. 跑硬核策略
            for (const [name, logic] of Object.entries(TECH_MASTERS)) {
                const tag = logic(text, repo);
                if (tag) tags.push(tag);
            }

            // 2. 跑人才策略 (如果命中了硬核，也可以同时命中人才，比如"Awesome LLM Agent")
            for (const [name, logic] of Object.entries(TALENT_MASTERS)) {
                const tag = logic(text);
                if (tag) tags.push(tag);
            }

            // 3. 兜底策略：如果上面都没命中，但它很火，打个"野生热点"标签
            if (tags.length === 0) {
                tags.push('VIRAL_UNCATEGORIZED');
            }

            // 统计标签分布
            tags.forEach(t => { stats[t] = (stats[t] || 0) + 1; });

            return {
                name: repo.full_name,
                desc: repo.description,
                lang: repo.language,
                stars: repo.stargazers_count,
                tags: tags, // 这里会显示 [TECH_ACCELERATOR] 或 [TALENT_GROWTH]
                url: repo.html_url
            };
        });

        if (signals.length > 0) {
            // 生成统计摘要
            const summary = Object.entries(stats)
                .map(([key, val]) => `${key}: ${val}`)
                .join(', ');
            
            console.log(`📊 本次热点分布: ${summary}`);

            const path = `data/tech/${new Date().toISOString().split('T')[0]}/sentinel-${new Date().getHours()}h.json`;
            
            await octokit.repos.createOrUpdateFileContents({
                owner: CONFIG.owner,
                repo: CONFIG.repo,
                path: path,
                message: `🤖 Update: ${summary}`, // Commit 信息里直接带上热点统计
                content: Buffer.from(JSON.stringify({
                    meta: { 
                        scanned_at: new Date().toISOString(),
                        total_items: signals.length,
                        trend_summary: stats // 将统计数据也写入 JSON 头部
                    },
                    items: signals
                }, null, 2)).toString('base64')
            });
            console.log(`✅ 已存档 ${signals.length} 条数据 -> ${path}`);
        } else {
            console.log("⚠️ 未发现显著波动");
        }
    } catch (e) {
        console.error("❌ Error:", e.message);
        process.exit(1);
    }
}

run();
