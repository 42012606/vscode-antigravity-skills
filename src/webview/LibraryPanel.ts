import * as vscode from 'vscode';
import { LibraryService } from '../services/libraryService';

export class LibraryPanel {
    public static currentPanel: LibraryPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, libraryService: LibraryService) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (LibraryPanel.currentPanel) {
            LibraryPanel.currentPanel._panel.reveal(column);
            LibraryPanel.currentPanel._update(libraryService);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'antiSkillsLibrary',
            '🛠️ Skills Manager',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        LibraryPanel.currentPanel = new LibraryPanel(panel, extensionUri, libraryService);
    }

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        libraryService: LibraryService
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        this._update(libraryService);

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // 监听 LibraryService 的变更事件
        libraryService.onDidChange(() => {
            console.log('[LibraryPanel] Detected library service change, updating UI...');
            this._update(libraryService);
        }, null, this._disposables);

        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'deploySkill':
                        const skills = await libraryService.getSkills();
                        const skill = skills.find(s => s.id === message.id);
                        if (skill) {
                            await libraryService.deploySkill(skill);
                            vscode.window.showInformationMessage(`✅ 已部署: ${skill.name}`);
                            this._update(libraryService);
                        }
                        break;
                    case 'deployRule':
                        const rules = await libraryService.getRules();
                        const rule = rules.find(r => r.id === message.id);
                        if (rule) {
                            await libraryService.deployRule(rule);
                            vscode.window.showInformationMessage(`✅ 已部署: ${rule.name}`);
                            this._update(libraryService);
                        }
                        break;
                    case 'removeSkill':
                        await libraryService.removeSkill(message.id);
                        vscode.window.showInformationMessage(`🗑️ 已移除: ${message.id}`);
                        this._update(libraryService);
                        break;
                    case 'removeRule':
                        await libraryService.removeRule(message.id);
                        vscode.window.showInformationMessage(`🗑️ 已移除: ${message.id}`);
                        this._update(libraryService);
                        break;
                    case 'setLibraryPath':
                        vscode.commands.executeCommand('antiSkills.setLibraryPath');
                        break;
                    case 'refresh':
                        libraryService.refresh();
                        this._update(libraryService);
                        break;
                    case 'openGitHub':
                        vscode.env.openExternal(vscode.Uri.parse('https://github.com/你的用户名/antigravity-skills-manager'));
                        break;
                    case 'openFeedback':
                        vscode.env.openExternal(vscode.Uri.parse('https://github.com/你的用户名/antigravity-skills-manager/issues'));
                        break;
                    case 'openSponsor':
                        vscode.env.openExternal(vscode.Uri.parse('https://github.com/sponsors/你的用户名'));
                        break;
                    case 'syncSkill':
                        const wsSkills = libraryService.getLocalWorkspaceSkills();
                        const wsSkill = wsSkills.find(s => s.id === message.id);
                        if (wsSkill) {
                            const direction = message.direction || 'up';
                            await libraryService.syncSkill(wsSkill, direction);
                            const actionText = direction === 'up' ? '同步到库' : '从库拉取';
                            vscode.window.showInformationMessage(`📥 已${actionText}: ${wsSkill.name}`);
                            this._update(libraryService);
                        }
                        break;
                    case 'syncRule':
                        const wsRules = libraryService.getLocalWorkspaceRules();
                        const wsRule = wsRules.find(r => r.id === message.id);
                        if (wsRule) {
                            const direction = message.direction || 'up';
                            await libraryService.syncRule(wsRule, direction);
                            const actionText = direction === 'up' ? '同步到库' : '从库拉取';
                            vscode.window.showInformationMessage(`📥 已${actionText}: ${wsRule.name}`);
                            this._update(libraryService);
                        }
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    private async _update(libraryService: LibraryService) {
        const skills = await libraryService.getSkills();
        const allRules = await libraryService.getRules();
        const deployedSkills = libraryService.getDeployedSkills();
        const deployedRules = libraryService.getDeployedRules();
        const localWorkspaceSkills = libraryService.getLocalWorkspaceSkills();
        const localWorkspaceRules = libraryService.getLocalWorkspaceRules();
        const libPath = libraryService.getLibraryPath();

        this._panel.webview.html = this._getHtmlForWebview(
            skills,
            allRules,
            deployedSkills.map(s => s.id),
            deployedRules.map(r => r.id),
            localWorkspaceSkills,
            localWorkspaceRules,
            libPath
        );
    }

    private _getHtmlForWebview(
        skills: any[],
        projectRules: any[],
        deployedSkillIds: string[],
        deployedRuleIds: string[],
        workspaceOnlySkills: any[],
        workspaceOnlyRules: any[],
        libPath: string
    ) {
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Skills Manager</title>
    <style>
        :root {
            --bg-primary: #0d1117;
            --bg-secondary: #161b22;
            --bg-tertiary: #21262d;
            --border: #30363d;
            --text-primary: #e6edf3;
            --text-secondary: #8b949e;
            --accent: #58a6ff;
            --accent-hover: #79c0ff;
            --success: #3fb950;
            --warning: #d29922;
            --danger: #f85149;
            --gradient-start: #667eea;
            --gradient-end: #764ba2;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            min-height: 100vh;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 24px;
        }

        header {
            text-align: center;
            padding: 32px 24px;
            background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end));
            border-radius: 16px;
            margin-bottom: 24px;
            box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
        }

        .logo {
            font-size: 48px;
            margin-bottom: 8px;
        }

        header h1 {
            font-size: 1.8rem;
            margin-bottom: 8px;
            font-weight: 700;
        }

        header p {
            opacity: 0.9;
            font-size: 1rem;
        }

        .toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding: 16px;
            background: var(--bg-secondary);
            border-radius: 12px;
            border: 1px solid var(--border);
        }

        .lib-path {
            font-size: 13px;
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .lib-path code {
            background: var(--bg-tertiary);
            padding: 4px 8px;
            border-radius: 4px;
            font-family: 'Consolas', monospace;
        }

        .toolbar-actions {
            display: flex;
            gap: 8px;
        }

        button {
            background: var(--bg-tertiary);
            color: var(--text-primary);
            border: 1px solid var(--border);
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        button:hover {
            background: var(--accent);
            border-color: var(--accent);
        }

        .btn-primary {
            background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end));
            border: none;
        }

        .btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .section {
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            border-radius: 12px;
            margin-bottom: 20px;
            overflow: hidden;
        }

        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            background: var(--bg-tertiary);
            border-bottom: 1px solid var(--border);
        }

        .section-title {
            font-size: 15px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .badge {
            background: var(--accent);
            color: white;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 12px;
            font-weight: 500;
        }

        .item-list {
            padding: 8px;
        }

        .item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px;
            margin: 8px;
            background: var(--bg-primary);
            border-radius: 10px;
            border: 1px solid var(--border);
            transition: all 0.2s;
        }

        .item:hover {
            border-color: var(--accent);
            transform: translateX(4px);
        }

        .item.deployed {
            border-color: var(--success);
            background: rgba(63, 185, 80, 0.1);
        }

        .item-info { flex: 1; }

        .item-name {
            font-weight: 600;
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .item-desc {
            font-size: 13px;
            color: var(--text-secondary);
        }

        .item-status {
            font-size: 12px;
            padding: 8px 16px;
            border-radius: 8px;
            background: var(--success);
            color: white;
            font-weight: 500;
            min-width: 80px;
            text-align: center;
        }

        .item-actions {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .btn-danger {
            background: transparent;
            color: var(--text-secondary);
            border: 1px solid var(--border);
            padding: 6px 10px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .btn-danger:hover {
            background: var(--danger);
            border-color: var(--danger);
            color: white;
        }

        .btn-sync {
            padding: 8px 14px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
            border: none;
            color: white;
        }

        .btn-sync-up {
            background: linear-gradient(135deg, #58a6ff, #3fb950);
        }

        .btn-sync-up:hover {
            transform: scale(1.02);
            box-shadow: 0 4px 12px rgba(88, 166, 255, 0.4);
        }

        .btn-sync-down {
            background: linear-gradient(135deg, #d29922, #ea4aaa);
        }

        .btn-sync-down:hover {
            transform: scale(1.02);
            box-shadow: 0 4px 12px rgba(210, 153, 34, 0.4);
        }

        .btn-sync-conflict {
            background: var(--danger);
        }

        .workspace-only {
            border-color: var(--warning);
        }

        .collapsible .section-header {
            cursor: pointer;
            user-select: none;
        }

        .toggle-icon {
            font-size: 12px;
            transition: transform 0.2s;
        }

        .collapsible.collapsed .toggle-icon {
            transform: rotate(-90deg);
        }

        .collapsible.collapsed .item-list {
            display: none;
        }

        .section-header:hover {
            background: var(--bg-primary);
        }

        .empty {
            text-align: center;
            padding: 40px;
            color: var(--text-secondary);
        }

        .empty-icon {
            font-size: 48px;
            margin-bottom: 12px;
            opacity: 0.5;
        }

        /* 底部支持栏 */
        .support-bar {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 16px;
            padding: 20px;
            margin-top: 24px;
            background: var(--bg-secondary);
            border-radius: 12px;
            border: 1px solid var(--border);
        }

        .support-text {
            color: var(--text-secondary);
            font-size: 14px;
        }

        .support-btn {
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .btn-star {
            background: #ffd93d;
            color: #000;
            border: none;
        }

        .btn-star:hover {
            background: #ffed4a;
            transform: scale(1.05);
        }

        .btn-feedback {
            background: var(--bg-tertiary);
            color: var(--text-primary);
            border: 1px solid var(--border);
        }

        .btn-feedback:hover {
            border-color: var(--accent);
            color: var(--accent);
        }

        .btn-sponsor {
            background: linear-gradient(135deg, #ea4aaa, #ff6b6b);
            color: white;
            border: none;
        }

        .btn-sponsor:hover {
            transform: scale(1.05);
            box-shadow: 0 4px 12px rgba(234, 74, 170, 0.4);
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="logo">📦</div>
            <h1>Skills Manager</h1>
            <p>AI 编码助手的 Skills/Rules 管理器</p>
        </header>

        <div class="toolbar">
            <div class="lib-path">
                📂 库路径: ${libPath ? `<code>${libPath}</code>` : '<span style="color: var(--warning)">未设置</span>'}
            </div>
            <div class="toolbar-actions">
                <button onclick="refresh()">🔄 刷新数据</button>
                <button onclick="setLibraryPath()">📁 设置路径</button>
            </div>
        </div>

        <div class="section collapsible">
            <div class="section-header" onclick="toggleSection(this)">
                <span class="section-title">📜 Rules <span class="badge">${projectRules.length}</span></span>
                <span class="toggle-icon">▼</span>
            </div>
            <div class="item-list">
                ${projectRules.length === 0 ? `
                    <div class="empty">
                        <div class="empty-icon">📜</div>
                        <div>暂无 Rules</div>
                    </div>
                ` : projectRules.map(r => {
            const normalizedDeployed = deployedRuleIds.map(id => id.toLowerCase().replace(/\s+/g, ''));
            const isDeployed = deployedRuleIds.includes(r.id) ||
                normalizedDeployed.includes(r.id.toLowerCase().replace(/\s+/g, '')) ||
                normalizedDeployed.includes(r.name.toLowerCase().replace(/[🏛️📜📦\s]/g, ''));
            return `
                    <div class="item ${isDeployed ? 'deployed' : ''}">
                        <div class="item-info">
                            <div class="item-name">${r.name}</div>
                            <div class="item-desc">${r.description || '无描述'}</div>
                        </div>
                        <div class="item-actions">
                            ${isDeployed
                    ? `<span class="item-status">✓ 已部署</span><button class="btn-danger" onclick="removeRule('${r.id}')">🗑️</button>`
                    : `<button class="btn-primary" onclick="deployRule('${r.id}')">🚀 部署</button>`
                }
                        </div>
                    </div>
                `}).join('')}
            </div>
        </div>

        <div class="section collapsible">
            <div class="section-header" onclick="toggleSection(this)">
                <span class="section-title">📦 Skills <span class="badge">${skills.length}</span></span>
                <span class="toggle-icon">▼</span>
            </div>
            <div class="item-list">
                ${skills.length === 0 ? `
                    <div class="empty">
                        <div class="empty-icon">📦</div>
                        <div>暂无 Skills</div>
                    </div>
                ` : skills.map(s => `
                    <div class="item ${deployedSkillIds.includes(s.id) ? 'deployed' : ''}">
                        <div class="item-info">
                            <div class="item-name">${s.name}</div>
                            <div class="item-desc">${s.description || '无描述'}</div>
                        </div>
                        <div class="item-actions">
                            ${deployedSkillIds.includes(s.id)
                        ? `<span class="item-status">✓ 已部署</span><button class="btn-danger" onclick="removeSkill('${s.id}')">🗑️</button>`
                        : `<button class="btn-primary" onclick="deploySkill('${s.id}')">🚀 部署</button>`
                    }
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        ${(workspaceOnlySkills.length > 0 || workspaceOnlyRules.length > 0) ? `
        <div class="section collapsible workspace-only">
            <div class="section-header" onclick="toggleSection(this)">
                <span class="section-title">🔄 本地工作区对比 <span class="badge" style="background:#d29922">${workspaceOnlySkills.length + workspaceOnlyRules.length}</span></span>
                <span class="toggle-icon">▼</span>
            </div>
            <div class="item-list">
                ${workspaceOnlySkills.map(s => {
                        const isNew = s.status === 'new';
                        const isConflict = s.status === 'conflict';
                        const isRemoteAhead = s.status === 'remote_ahead';
                        const isLocalAhead = s.status === 'local_ahead';

                        let descText = s.syncHint || '未同步';
                        let descClass = '';
                        if (isConflict) {
                            descText = '⚠️ 冲突：双边均有修改';
                            descClass = 'text-warning';
                        } else if (isRemoteAhead) {
                            descText = '仓库内容比本地更新';
                        } else if (isLocalAhead) {
                            descText = '本地已修改，建议上传';
                        }

                        const renderButtons = () => {
                            if (isNew) {
                                return `<button class="btn-sync btn-sync-up" onclick="syncSkill('${s.id}', 'up')">↑ 上传到库</button>`;
                            }
                            return `
                            <button class="btn-sync btn-sync-up" onclick="syncSkill('${s.id}', 'up')">↑ 上传到库</button>
                            <button class="btn-sync btn-sync-down" onclick="syncSkill('${s.id}', 'down')">↓ 从库拉取</button>
                        `;
                        };

                        return `
                    <div class="item">
                        <div class="item-info">
                            <div class="item-name">📦 ${s.name}</div>
                            <div class="item-desc ${descClass}">${descText}</div>
                        </div>
                        <div class="item-actions">
                            ${renderButtons()}
                            <button class="btn-danger" onclick="removeSkill('${s.id}')">🗑️</button>
                        </div>
                    </div>
                    `;
                    }).join('')}
                ${workspaceOnlyRules.map(r => {
                        const isNew = r.status === 'new';
                        const isConflict = r.status === 'conflict';
                        const isRemoteAhead = r.status === 'remote_ahead';
                        const isLocalAhead = r.status === 'local_ahead';

                        let descText = r.syncHint || '未同步';
                        let descClass = '';
                        if (isConflict) {
                            descText = '⚠️ 冲突：双边均有修改';
                            descClass = 'text-warning';
                        } else if (isRemoteAhead) {
                            descText = '仓库内容比本地更新';
                        } else if (isLocalAhead) {
                            descText = '本地已修改，建议上传';
                        }

                        const renderButtons = () => {
                            if (isNew) {
                                return `<button class="btn-sync btn-sync-up" onclick="syncRule('${r.id}', 'up')">↑ 上传到库</button>`;
                            }
                            return `
                            <button class="btn-sync btn-sync-up" onclick="syncRule('${r.id}', 'up')">↑ 上传到库</button>
                            <button class="btn-sync btn-sync-down" onclick="syncRule('${r.id}', 'down')">↓ 从库拉取</button>
                        `;
                        };

                        return `
                    <div class="item">
                        <div class="item-info">
                            <div class="item-name">📜 ${r.name}</div>
                            <div class="item-desc ${descClass}">${descText}</div>
                        </div>
                        <div class="item-actions">
                            ${renderButtons()}
                            <button class="btn-danger" onclick="removeRule('${r.id}')">🗑️</button>
                        </div>
                    </div>
                    `;
                    }).join('')}
            </div>
        </div>
        ` : ''}

        <div class="support-bar">
            <span class="support-text">觉得好用？给个 ⭐ 支持一下！</span>
            <button class="support-btn btn-star" onclick="openGitHub()">⭐ 星标</button>
            <button class="support-btn btn-feedback" onclick="openFeedback()">💬 反馈</button>
            <button class="support-btn btn-sponsor" onclick="openSponsor()">❤️ 赞助</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function deploySkill(id) {
            vscode.postMessage({ command: 'deploySkill', id });
        }

        function deployRule(id) {
            vscode.postMessage({ command: 'deployRule', id });
        }

        function setLibraryPath() {
            vscode.postMessage({ command: 'setLibraryPath' });
        }

        function refresh() {
            vscode.postMessage({ command: 'refresh' });
        }

        function openGitHub() {
            vscode.postMessage({ command: 'openGitHub' });
        }

        function openFeedback() {
            vscode.postMessage({ command: 'openFeedback' });
        }

        function openSponsor() {
            vscode.postMessage({ command: 'openSponsor' });
        }

        function removeSkill(id) {
            vscode.postMessage({ command: 'removeSkill', id });
        }

        function removeRule(id) {
            vscode.postMessage({ command: 'removeRule', id });
        }

        function syncSkill(id, direction) {
            vscode.postMessage({ command: 'syncSkill', id, direction });
        }

        function syncRule(id, direction) {
            vscode.postMessage({ command: 'syncRule', id, direction });
        }

        function toggleSection(header) {
            const section = header.parentElement;
            section.classList.toggle('collapsed');
        }
    </script>
</body>
</html>`;
    }

    public dispose() {
        LibraryPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const d = this._disposables.pop();
            if (d) d.dispose();
        }
    }
}
