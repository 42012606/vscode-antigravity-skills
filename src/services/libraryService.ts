import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';
import * as crypto from 'crypto';

// 同步状态枚举
export type SyncStatus = 'new' | 'synced' | 'local_ahead' | 'remote_ahead' | 'conflict';

export interface SkillItem {
    id: string;
    name: string;
    description: string;
    path: string;
    status?: SyncStatus;      // 同步状态
    syncHint?: string;        // 行内状态提示
}

export interface RuleItem {
    id: string;
    name: string;
    description: string;
    path: string;
    status?: SyncStatus;      // 同步状态
    syncHint?: string;        // 行内状态提示
}

// 元数据结构
interface SyncMetaEntry {
    lastSyncHash: string;
    lastSyncTime: string;
}

interface SyncMeta {
    skills: { [id: string]: SyncMetaEntry };
    rules: { [id: string]: SyncMetaEntry };
}


export class LibraryService {
    private skills: SkillItem[] = [];
    private rules: RuleItem[] = [];
    private _onDidChange = new vscode.EventEmitter<void>();
    public readonly onDidChange = this._onDidChange.event;
    private watchers: vscode.FileSystemWatcher[] = [];

    constructor() {
        this.refresh();
        this.setupWatchers();
    }

    private setupWatchers(): void {
        // 清理旧的 Watchers
        this.watchers.forEach(w => w.dispose());
        this.watchers = [];

        const libPath = this.getLibraryPath();
        const workspaceRoot = this.getWorkspaceRoot();

        console.log(`[LibraryService] Setting up watchers. Lib: ${libPath}, Workspace: ${workspaceRoot}`);

        if (libPath && fs.existsSync(libPath)) {
            const pattern = new vscode.RelativePattern(libPath, '**/.agent/**/*.{md,json}');
            const watcher = vscode.workspace.createFileSystemWatcher(pattern);
            watcher.onDidChange(() => this.onFileChanged());
            watcher.onDidCreate(() => this.onFileChanged());
            watcher.onDidDelete(() => this.onFileChanged());
            this.watchers.push(watcher);
        }

        if (workspaceRoot && fs.existsSync(workspaceRoot)) {
            const pattern = new vscode.RelativePattern(workspaceRoot, '**/.agent/**/*.{md,json}');
            const watcher = vscode.workspace.createFileSystemWatcher(pattern);
            watcher.onDidChange(() => this.onFileChanged());
            watcher.onDidCreate(() => this.onFileChanged());
            watcher.onDidDelete(() => this.onFileChanged());
            this.watchers.push(watcher);
        }
    }

    private onFileChanged(): void {
        console.log('[LibraryService] File change detected, refreshing...');
        this.refresh();
        this._onDidChange.fire();
    }

    // ========== 元数据管理 ==========

    private getSyncMetaPath(): string | undefined {
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) return undefined;
        return path.join(workspaceRoot, '.agent', '.sync_meta.json');
    }

    private loadSyncMeta(): SyncMeta {
        const metaPath = this.getSyncMetaPath();
        if (metaPath && fs.existsSync(metaPath)) {
            try {
                const content = fs.readFileSync(metaPath, 'utf-8');
                return JSON.parse(content);
            } catch {
                // 文件损坏，返回空结构
            }
        }
        return { skills: {}, rules: {} };
    }

    private saveSyncMeta(meta: SyncMeta): void {
        const metaPath = this.getSyncMetaPath();
        if (!metaPath) return;
        const dir = path.dirname(metaPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
    }

    // 计算目录的内容哈希（递归所有文件）
    private computeDirHash(dirPath: string): string {
        if (!fs.existsSync(dirPath)) return '';
        const hash = crypto.createHash('md5');
        const entries = fs.readdirSync(dirPath, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                hash.update(this.computeDirHash(fullPath));
            } else {
                hash.update(fs.readFileSync(fullPath));
            }
        }
        return hash.digest('hex');
    }

    // 计算单个文件的哈希
    private computeFileHash(filePath: string): string {
        if (!fs.existsSync(filePath)) return '';
        const content = fs.readFileSync(filePath);
        return crypto.createHash('md5').update(content).digest('hex');
    }

    // 分析 Skill 同步状态
    private analyzeSkillStatus(skillId: string, localPath: string): { status: SyncStatus; hint: string } {
        const libPath = this.getLibraryPath();
        const meta = this.loadSyncMeta();
        const entry = meta.skills[skillId];

        // 查找库中该 Skill 的位置（仅支持标准 .agent 路径）
        let libSkillPath = '';
        if (libPath) {
            const p = path.join(libPath, '.agent', 'skills', skillId);
            libSkillPath = fs.existsSync(p) ? p : '';
        }

        const localHash = this.computeDirHash(localPath);
        const libHash = libSkillPath ? this.computeDirHash(libSkillPath) : '';
        const baseHash = entry?.lastSyncHash || '';

        // 库中不存在
        if (!libHash) {
            return { status: 'new', hint: '库中无此技能，可上传' };
        }

        // 完全一致
        if (localHash === libHash) {
            return { status: 'synced', hint: '已同步' };
        }

        // 本地有修改，库未变
        if (localHash !== baseHash && libHash === baseHash) {
            return { status: 'local_ahead', hint: '本地已修改，建议上传' };
        }

        // 库有更新，本地未变
        if (localHash === baseHash && libHash !== baseHash) {
            return { status: 'remote_ahead', hint: '库有更新，建议拉取' };
        }

        // 双边都有修改
        return { status: 'conflict', hint: '⚠️ 冲突：双边均有修改' };
    }

    // 规范化 Rule 内容（统一换行符，并确保包含 trigger）
    private normalizeRuleContent(content: string): string {
        // 1. 统一换行符为 \n
        let normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        // 2. 确保包含 trigger: always_on
        if (!normalized.includes('trigger: always_on')) {
            if (normalized.startsWith('---')) {
                const parts = normalized.split('---');
                if (parts.length >= 3) {
                    const frontmatter = parts[1];
                    parts[1] = frontmatter.trim() + '\ntrigger: always_on\n';
                    normalized = parts.join('---');
                }
            } else {
                normalized = `---\ntrigger: always_on\n---\n\n` + normalized;
            }
        }

        return normalized;
    }

    // 计算 Rule 的标准化哈希
    private computeRuleHash(filePath: string): string {
        if (!fs.existsSync(filePath)) return '';
        const content = fs.readFileSync(filePath, 'utf8');
        const normalized = this.normalizeRuleContent(content);
        return crypto.createHash('md5').update(normalized).digest('hex');
    }

    // 分析 Rule 同步状态
    private analyzeRuleStatus(ruleId: string, localPath: string): { status: SyncStatus; hint: string } {
        const libPath = this.getLibraryPath();
        const meta = this.loadSyncMeta();
        const entry = meta.rules[ruleId];

        // 查找库中该 Rule 的位置（仅支持标准 .agent 路径）
        let libRulePath = '';
        if (libPath) {
            const p = path.join(libPath, '.agent', 'rules', `${ruleId}.md`);
            libRulePath = fs.existsSync(p) ? p : '';
        }

        const localHash = this.computeRuleHash(localPath);
        const libHash = libRulePath ? this.computeRuleHash(libRulePath) : '';
        const baseHash = entry?.lastSyncHash || '';

        // 库中不存在
        if (!libHash) {
            return { status: 'new', hint: '库中无此规则，可上传' };
        }

        // 完全一致
        if (localHash === libHash) {
            return { status: 'synced', hint: '已部署' };
        }

        // 本地有修改，库未变
        if (localHash !== baseHash && libHash === baseHash) {
            return { status: 'local_ahead', hint: '本地已修改，建议上传' };
        }

        // 库有更新，本地未变 (注意：这里比较的是标准化后的 Hash，所以单纯缺失 trigger 不算更新)
        if (localHash === baseHash && libHash !== baseHash) {
            return { status: 'remote_ahead', hint: '库有更新，建议拉取' };
        }

        // 双边都有修改
        return { status: 'conflict', hint: '⚠️ 冲突：双边均有修改' };
    }

    getLibraryPath(): string {
        const config = vscode.workspace.getConfiguration('antiSkills');
        return config.get<string>('libraryPath') || '';
    }

    getWorkspaceRoot(): string | undefined {
        const folders = vscode.workspace.workspaceFolders;
        return folders?.[0]?.uri.fsPath;
    }

    // 检测工作区是否与库路径相同（危险场景）
    isWorkspaceEqualToLibrary(): boolean {
        const workspaceRoot = this.getWorkspaceRoot();
        const libPath = this.getLibraryPath();
        if (!workspaceRoot || !libPath) return false;
        return path.normalize(workspaceRoot).toLowerCase() === path.normalize(libPath).toLowerCase();
    }

    refresh(): void {
        console.log('[LibraryService] Refreshing data...');
        this.skills = [];
        this.rules = [];

        const libPath = this.getLibraryPath();
        console.log(`[LibraryService] Library Path: ${libPath}`);

        if (!libPath || !fs.existsSync(libPath)) {
            console.warn('[LibraryService] Library path invalid or missing');
            return;
        }

        // 扫描 Skills
        const skillsDir = path.join(libPath, '.agent', 'skills');
        console.log(`[LibraryService] Scanning skills in: ${skillsDir}`);
        if (fs.existsSync(skillsDir)) {
            const dirs = fs.readdirSync(skillsDir, { withFileTypes: true });
            for (const dir of dirs) {
                if (dir.isDirectory()) {
                    const skillMd = path.join(skillsDir, dir.name, 'SKILL.md');
                    if (fs.existsSync(skillMd)) {
                        const content = fs.readFileSync(skillMd, 'utf-8');
                        const parsed = this.parseSkillMd(content, dir.name);
                        parsed.path = path.join(skillsDir, dir.name);
                        this.skills.push(parsed);
                    }
                }
            }
        }

        // 扫描 Rules（从 .agent/rules/ 目录）
        const rulesDir = path.join(libPath, '.agent', 'rules');
        if (fs.existsSync(rulesDir)) {
            const files = fs.readdirSync(rulesDir, { withFileTypes: true });
            for (const file of files) {
                if (file.isFile() && file.name.endsWith('.md')) {
                    const rulePath = path.join(rulesDir, file.name);
                    const content = fs.readFileSync(rulePath, 'utf-8');
                    const parsed = this.parseRuleMd(content, file.name);
                    parsed.path = rulePath;
                    this.rules.push(parsed);
                }
            }
        }
        // 扫描完成后通知 UI
        console.log('[LibraryService] Refresh complete. Notifying listeners...');
        this._onDidChange.fire();
    }

    private parseSkillMd(content: string, fallbackName: string): SkillItem {
        let name = fallbackName;
        let description = '';

        const match = content.match(/^---\r?\n([\s\S]+?)\r?\n---/);
        if (match) {
            const yaml = match[1];
            const nameMatch = yaml.match(/name:\s*(.+)/);
            const descMatch = yaml.match(/description:\s*(.+)/);
            if (nameMatch) name = nameMatch[1].trim();
            if (descMatch) description = descMatch[1].trim();
        }

        return { id: fallbackName, name, description, path: '' };
    }

    private parseRuleMd(content: string, filename: string): RuleItem {
        const id = filename.toLowerCase().replace('.md', '').trim();
        let name = id;
        let description = '';

        // 尝试解析 YAML Frontmatter 中的 description
        const frontmatterMatch = content.match(/^---\r?\n([\s\S]+?)\r?\n---/);
        if (frontmatterMatch) {
            const frontmatterLines = frontmatterMatch[1].split(/\r?\n/);
            for (const line of frontmatterLines) {
                const descMatch = line.trim().match(/^description:\s*(.+)$/);
                if (descMatch) {
                    description = descMatch[1].trim();
                    break;
                }
            }
        }

        // 移除 YAML Frontmatter 以便处理正文
        const frontmatterRegex = /^---\r?\n[\s\S]+?\r?\n---\r?\n/;
        const bodyContent = content.replace(frontmatterRegex, '').trim();

        const titleMatch = bodyContent.match(/^#\s+(.+)/m);
        if (titleMatch) {
            name = titleMatch[1].trim();
        }

        // 如果没有从 Frontmatter 提取到 description，则尝试从正文提取
        if (!description) {
            const lines = bodyContent.split(/\r?\n/);
            for (const line of lines) {
                const trimmed = line.trim();
                // 跳过空行和标题
                if (!trimmed || trimmed.startsWith('#')) {
                    continue;
                }

                // 清理列表标记 (*, -, 1.)
                let cleanLine = trimmed;
                if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
                    cleanLine = trimmed.replace(/^[\*\-]\s+/, '');
                } else if (/^\d+\./.test(trimmed)) {
                    cleanLine = trimmed.replace(/^\d+\.\s+/, '');
                }

                // 如果这一行有实质内容，就用它做描述
                if (cleanLine.length > 5) {
                    // 去除可能存在的 markdown 加粗/斜体标记
                    cleanLine = cleanLine.replace(/\*\*/g, '').replace(/\*/g, '');
                    description = cleanLine.substring(0, 60) + (cleanLine.length > 60 ? '...' : '');
                    break;
                }
            }
        }

        return { id, name, description, path: '' };
    }

    async getSkills(): Promise<SkillItem[]> {
        return this.skills;
    }

    async getRules(): Promise<RuleItem[]> {
        return this.rules;
    }

    // 检测当前工作区已部署的 Skills
    getDeployedSkills(): SkillItem[] {
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) return [];

        const deployed: SkillItem[] = [];
        const skillsDir = path.join(workspaceRoot, '.agent', 'skills');

        console.log('[Skills Manager] Checking deployed skills in:', skillsDir);

        if (fs.existsSync(skillsDir)) {
            const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
            for (const entry of entries) {
                // Junction 链接在 Windows 上显示为目录
                const entryPath = path.join(skillsDir, entry.name);
                const skillMd = path.join(entryPath, 'SKILL.md');

                console.log('[Skills Manager] Checking:', entry.name, 'exists:', fs.existsSync(skillMd));

                if (fs.existsSync(skillMd)) {
                    deployed.push({
                        id: entry.name,
                        name: entry.name,
                        description: '已部署',
                        path: entryPath
                    });
                }
            }
        }

        console.log('[Skills Manager] Deployed skills:', deployed.map(s => s.id));
        return deployed;
    }

    // 检测当前工作区已部署的 Rules
    getDeployedRules(): RuleItem[] {
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) return [];

        const deployed: RuleItem[] = [];
        const rulesDir = path.join(workspaceRoot, '.agent', 'rules');

        if (fs.existsSync(rulesDir)) {
            try {
                const files = fs.readdirSync(rulesDir, { withFileTypes: true });
                for (const file of files) {
                    if (file.isFile() && file.name.endsWith('.md')) {
                        const rawId = file.name.toLowerCase().replace('.md', '').trim();
                        const filePath = path.join(rulesDir, file.name);
                        const content = fs.readFileSync(filePath, 'utf8');
                        const titleMatch = content.match(/^#\s+(.+)/m);
                        const title = titleMatch ? titleMatch[1].trim() : '';

                        if (!deployed.find(r => r.id === rawId)) {
                            deployed.push({ id: rawId, name: title || file.name, description: '已部署', path: filePath });
                        }
                    }
                }
            } catch (e) {
                console.error(`[LibraryService] Error reading rules directory ${rulesDir}:`, e);
            }
        }
        return deployed;
    }

    async deploySkill(skill: SkillItem): Promise<void> {
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) {
            vscode.window.showErrorMessage('请先打开一个工作区');
            return;
        }

        const targetDir = path.join(workspaceRoot, '.agent', 'skills');
        const targetPath = path.join(targetDir, skill.id);

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        if (fs.existsSync(targetPath)) {
            fs.rmSync(targetPath, { recursive: true, force: true });
        }

        // 创建 Junction (Windows) 或 symlink
        if (process.platform === 'win32') {
            cp.execSync(`cmd /c mklink /J "${targetPath}" "${skill.path}"`);
        } else {
            fs.symlinkSync(skill.path, targetPath, 'dir');
        }

        // 更新元数据
        const meta = this.loadSyncMeta();
        const newHash = this.computeDirHash(targetPath);
        meta.skills[skill.id] = {
            lastSyncHash: newHash,
            lastSyncTime: new Date().toISOString()
        };
        this.saveSyncMeta(meta);
        this.refresh();
    }

    async deployRule(rule: RuleItem): Promise<void> {
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) {
            vscode.window.showErrorMessage('请先打开一个工作区');
            return;
        }

        // Rules 部署到 .agent/rules/ 目录
        const targetDir = path.join(workspaceRoot, '.agent', 'rules');
        const targetPath = path.join(targetDir, path.basename(rule.path));

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        let content = fs.readFileSync(rule.path, 'utf8');
        // 使用标准化内容写入本地（这会注入 trigger 并统一换行）
        content = this.normalizeRuleContent(content);

        fs.writeFileSync(targetPath, content, 'utf8');

        // 更新元数据
        const meta = this.loadSyncMeta();
        // 关键修复：使用 computeRuleHash 计算基准哈希
        // 这样计算出的 hash 包含了 trigger，与本地文件的 hash 一致
        const newHash = this.computeRuleHash(rule.path);

        meta.rules[rule.id] = {
            lastSyncHash: newHash,
            lastSyncTime: new Date().toISOString()
        };
        this.saveSyncMeta(meta);
        this.refresh();
    }

    async removeSkill(skillId: string): Promise<void> {
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) return;

        // 危险场景检测：工作区 === 库路径
        if (this.isWorkspaceEqualToLibrary()) {
            const choice = await vscode.window.showWarningMessage(
                `⚠️ 危险操作！当前工作区与库路径相同，删除将永久移除技能仓库源文件 "${skillId}"！此操作不可撤销！`,
                { modal: true },
                '确认删除源文件'
            );
            if (choice !== '确认删除源文件') {
                return;
            }
        }

        const targetPath = path.join(workspaceRoot, '.agent', 'skills', skillId);
        if (fs.existsSync(targetPath)) {
            fs.rmSync(targetPath, { recursive: true, force: true });
        }
    }

    async removeRule(ruleId: string): Promise<void> {
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) return;

        // 危险场景检测：工作区 === 库路径
        if (this.isWorkspaceEqualToLibrary()) {
            const choice = await vscode.window.showWarningMessage(
                `⚠️ 危险操作！当前工作区与库路径相同，删除将永久移除规则仓库源文件 "${ruleId}.md"！此操作不可撤销！`,
                { modal: true },
                '确认删除源文件'
            );
            if (choice !== '确认删除源文件') {
                return;
            }
        }

        const targetPath = path.join(workspaceRoot, '.agent', 'rules', `${ruleId}.md`);
        if (fs.existsSync(targetPath)) {
            fs.unlinkSync(targetPath);
        }
    }

    // 获取本地工作区的 Skills（包含同步状态分析）
    getLocalWorkspaceSkills(): SkillItem[] {
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) return [];

        const localSkills: SkillItem[] = [];
        const skillsDir = path.join(workspaceRoot, '.agent', 'skills');

        if (fs.existsSync(skillsDir)) {
            const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
            for (const entry of entries) {
                const entryPath = path.join(skillsDir, entry.name);
                const skillMd = path.join(entryPath, 'SKILL.md');

                if (fs.existsSync(skillMd)) {
                    const content = fs.readFileSync(skillMd, 'utf-8');
                    const parsed = this.parseSkillMd(content, entry.name);
                    parsed.path = entryPath;

                    // 分析同步状态
                    const { status, hint } = this.analyzeSkillStatus(entry.name, entryPath);
                    parsed.status = status;
                    parsed.syncHint = hint;

                    // 只返回需要用户关注的项（非 synced 状态）
                    if (status !== 'synced') {
                        localSkills.push(parsed);
                    }
                }
            }
        }
        return localSkills;
    }

    // 获取本地工作区的 Rules（包含同步状态分析）
    getLocalWorkspaceRules(): RuleItem[] {
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) return [];

        const localRules: RuleItem[] = [];
        const rulesDir = path.join(workspaceRoot, '.agent', 'rules');

        if (fs.existsSync(rulesDir)) {
            const files = fs.readdirSync(rulesDir, { withFileTypes: true });
            for (const file of files) {
                if (file.isFile() && file.name.endsWith('.md')) {
                    const ruleId = file.name.toLowerCase().replace('.md', '').trim();
                    const rulePath = path.join(rulesDir, file.name);
                    const content = fs.readFileSync(rulePath, 'utf-8');
                    const parsed = this.parseRuleMd(content, file.name);
                    parsed.path = rulePath;

                    // 分析同步状态
                    const { status, hint } = this.analyzeRuleStatus(ruleId, rulePath);
                    parsed.status = status;
                    parsed.syncHint = hint;

                    // 只返回需要用户关注的项（非 synced 状态）
                    if (status !== 'synced') {
                        localRules.push(parsed);
                    }
                }
            }
        }
        return localRules;
    }

    // 同步 Skill（支持双向）
    async syncSkill(skill: SkillItem, direction: 'up' | 'down'): Promise<void> {
        const libPath = this.getLibraryPath();
        const workspaceRoot = this.getWorkspaceRoot();

        if (!libPath || !workspaceRoot) {
            vscode.window.showErrorMessage('请先设置库路径');
            return;
        }

        const libSkillPath = path.join(libPath, '.agent', 'skills', skill.id);
        const localSkillPath = path.join(workspaceRoot, '.agent', 'skills', skill.id);

        try {
            if (direction === 'up') {
                const targetDir = path.join(libPath, '.agent', 'skills');
                if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
                if (fs.existsSync(libSkillPath)) fs.rmSync(libSkillPath, { recursive: true, force: true });
                this.copyDirRecursive(localSkillPath, libSkillPath);
            } else {
                const targetDir = path.join(workspaceRoot, '.agent', 'skills');
                if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
                if (fs.existsSync(localSkillPath)) fs.rmSync(localSkillPath, { recursive: true, force: true });
                this.copyDirRecursive(libSkillPath, localSkillPath);
            }

            const meta = this.loadSyncMeta();
            const newHash = this.computeDirHash(localSkillPath);
            meta.skills[skill.id] = { lastSyncHash: newHash, lastSyncTime: new Date().toISOString() };
            this.saveSyncMeta(meta);

            this.refresh();
        } catch (error) {
            console.error('[Sync Skill] Error:', error);
            vscode.window.showErrorMessage(`同步失败: ${error}`);
        }
    }

    // 同步 Rule（支持双向）
    async syncRule(rule: RuleItem, direction: 'up' | 'down'): Promise<void> {
        const libPath = this.getLibraryPath();
        const workspaceRoot = this.getWorkspaceRoot();

        if (!libPath || !workspaceRoot) {
            vscode.window.showErrorMessage('请先设置库路径');
            return;
        }

        const libRulePath = path.join(libPath, '.agent', 'rules', `${rule.id}.md`);
        const localRulePath = path.join(workspaceRoot, '.agent', 'rules', `${rule.id}.md`);

        try {
            if (direction === 'up') {
                const targetDir = path.join(libPath, '.agent', 'rules');
                if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
                fs.copyFileSync(localRulePath, libRulePath);
            } else {
                const targetDir = path.join(workspaceRoot, '.agent', 'rules');
                if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

                // 拉取时也要确保注入 trigger (以防库里没有)
                const ruleItem = { ...rule, path: libRulePath };
                await this.deployRule(ruleItem);
            }

            const meta = this.loadSyncMeta();
            const newHash = this.computeFileHash(localRulePath);
            meta.rules[rule.id] = { lastSyncHash: newHash, lastSyncTime: new Date().toISOString() };
            this.saveSyncMeta(meta);

            this.refresh();
        } catch (error) {
            console.error('[Sync Rule] Error:', error);
            vscode.window.showErrorMessage(`同步失败: ${error}`);
        }
    }

    // 保留旧方法以保持向后兼容
    async syncSkillToLibrary(skill: SkillItem): Promise<void> {
        return this.syncSkill(skill, 'up');
    }

    async syncRuleToLibrary(rule: RuleItem): Promise<void> {
        return this.syncRule(rule, 'up');
    }

    private copyDirRecursive(src: string, dest: string): void {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        const entries = fs.readdirSync(src, { withFileTypes: true });
        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            if (entry.isDirectory()) this.copyDirRecursive(srcPath, destPath);
            else fs.copyFileSync(srcPath, destPath);
        }
    }
}
