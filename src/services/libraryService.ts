import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';

export interface SkillItem {
    id: string;
    name: string;
    description: string;
    path: string;
}

export interface RuleItem {
    id: string;
    name: string;
    description: string;
    path: string;
}

export class LibraryService {
    private skills: SkillItem[] = [];
    private rules: RuleItem[] = [];

    constructor() {
        this.refresh();
    }

    getLibraryPath(): string {
        const config = vscode.workspace.getConfiguration('antiSkills');
        return config.get<string>('libraryPath') || '';
    }

    getWorkspaceRoot(): string | undefined {
        const folders = vscode.workspace.workspaceFolders;
        return folders?.[0]?.uri.fsPath;
    }

    refresh(): void {
        this.skills = [];
        this.rules = [];

        const libPath = this.getLibraryPath();
        if (!libPath || !fs.existsSync(libPath)) {
            return;
        }

        // 扫描 Skills
        const skillsDir = path.join(libPath, '.agent', 'skills');
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

        // 兼容旧目录 .gemini/rules/
        const oldRulesDir = path.join(libPath, '.gemini', 'rules');
        if (fs.existsSync(oldRulesDir)) {
            const files = fs.readdirSync(oldRulesDir, { withFileTypes: true });
            for (const file of files) {
                if (file.isFile() && file.name.endsWith('.md')) {
                    const rulePath = path.join(oldRulesDir, file.name);
                    const content = fs.readFileSync(rulePath, 'utf-8');
                    const parsed = this.parseRuleMd(content, file.name);
                    parsed.path = rulePath;
                    // 避免重复
                    if (!this.rules.find(r => r.id === parsed.id)) {
                        this.rules.push(parsed);
                    }
                }
            }
        }
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
        const id = filename.replace('.md', '');
        let name = id;
        let description = '';

        const titleMatch = content.match(/^#\s+(.+)/m);
        if (titleMatch) {
            name = titleMatch[1].trim();
        }

        const lines = content.split('\n');
        for (const line of lines) {
            if (line && !line.startsWith('#') && !line.startsWith('*') && !line.startsWith('-') && line.trim().length > 10) {
                description = line.trim().substring(0, 60) + '...';
                break;
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
        const possibleDirs = [
            path.join(workspaceRoot, '.agent', 'rules'),
            path.join(workspaceRoot, '.gemini', 'rules')
        ];

        console.log('[Skills Manager] Scanning for deployed rules in:', workspaceRoot);

        for (const rulesDir of possibleDirs) {
            if (fs.existsSync(rulesDir)) {
                try {
                    const files = fs.readdirSync(rulesDir, { withFileTypes: true });
                    for (const file of files) {
                        if (file.isFile() && file.name.endsWith('.md')) {
                            const rawId = file.name.replace('.md', '');
                            const filePath = path.join(rulesDir, file.name);
                            const content = fs.readFileSync(filePath, 'utf8');
                            // 尝试提取标题
                            const titleMatch = content.match(/^#\s+(.+)/m);
                            const title = titleMatch ? titleMatch[1].trim() : '';

                            if (!deployed.find(r => r.id === rawId)) {
                                deployed.push({ id: rawId, name: title || file.name, description: '已部署', path: filePath });
                            }
                            if (title && title !== rawId && !deployed.find(r => r.id === title)) {
                                deployed.push({ id: title, name: title, description: '已部署（按标题匹配）', path: filePath });
                            }
                        }
                    }
                } catch (e) {
                    console.error(`[Skills Manager] Error reading rules directory ${rulesDir}:`, e);
                }
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

        fs.copyFileSync(rule.path, targetPath);
    }

    async removeSkill(skillId: string): Promise<void> {
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) return;

        const targetPath = path.join(workspaceRoot, '.agent', 'skills', skillId);
        if (fs.existsSync(targetPath)) {
            fs.rmSync(targetPath, { recursive: true, force: true });
        }
    }

    async removeRule(ruleId: string): Promise<void> {
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) return;

        const targetPath = path.join(workspaceRoot, '.agent', 'rules', `${ruleId}.md`);
        if (fs.existsSync(targetPath)) {
            fs.unlinkSync(targetPath);
        }
    }

    // 获取工作区独有的 Skills（不在库中）
    getWorkspaceOnlySkills(): SkillItem[] {
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) return [];

        const librarySkillIds = this.skills.map(s => s.id);
        const workspaceOnly: SkillItem[] = [];
        const skillsDir = path.join(workspaceRoot, '.agent', 'skills');

        if (fs.existsSync(skillsDir)) {
            const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
            for (const entry of entries) {
                const entryPath = path.join(skillsDir, entry.name);
                const skillMd = path.join(entryPath, 'SKILL.md');

                if (fs.existsSync(skillMd) && !librarySkillIds.includes(entry.name)) {
                    const content = fs.readFileSync(skillMd, 'utf-8');
                    const parsed = this.parseSkillMd(content, entry.name);
                    parsed.path = entryPath;
                    workspaceOnly.push(parsed);
                }
            }
        }

        return workspaceOnly;
    }

    // 获取工作区独有的 Rules（不在库中）
    getWorkspaceOnlyRules(): RuleItem[] {
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) return [];

        const libraryRuleIds = this.rules.map(r => r.id);
        const workspaceOnly: RuleItem[] = [];
        const rulesDir = path.join(workspaceRoot, '.agent', 'rules');

        if (fs.existsSync(rulesDir)) {
            const files = fs.readdirSync(rulesDir, { withFileTypes: true });
            for (const file of files) {
                if (file.isFile() && file.name.endsWith('.md')) {
                    const ruleId = file.name.replace('.md', '');
                    if (!libraryRuleIds.includes(ruleId)) {
                        const rulePath = path.join(rulesDir, file.name);
                        const content = fs.readFileSync(rulePath, 'utf-8');
                        const parsed = this.parseRuleMd(content, file.name);
                        parsed.path = rulePath;
                        workspaceOnly.push(parsed);
                    }
                }
            }
        }

        return workspaceOnly;
    }

    // 同步 Skill 到库
    async syncSkillToLibrary(skill: SkillItem): Promise<void> {
        const libPath = this.getLibraryPath();
        if (!libPath) {
            vscode.window.showErrorMessage('请先设置库路径');
            return;
        }

        const targetDir = path.join(libPath, '.agent', 'skills');
        const targetPath = path.join(targetDir, skill.id);

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // 复制整个目录
        this.copyDirRecursive(skill.path, targetPath);
        this.refresh();
    }

    // 同步 Rule 到库
    async syncRuleToLibrary(rule: RuleItem): Promise<void> {
        const libPath = this.getLibraryPath();
        if (!libPath) {
            vscode.window.showErrorMessage('请先设置库路径');
            return;
        }

        const targetDir = path.join(libPath, '.agent', 'rules');
        const targetPath = path.join(targetDir, path.basename(rule.path));

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        fs.copyFileSync(rule.path, targetPath);
        this.refresh();
    }

    private copyDirRecursive(src: string, dest: string): void {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }

        const entries = fs.readdirSync(src, { withFileTypes: true });
        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                this.copyDirRecursive(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }
}
