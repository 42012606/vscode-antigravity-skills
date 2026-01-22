import * as vscode from 'vscode';
import { LibraryService } from './services/libraryService';
import { StatusBarProvider } from './providers/statusBarProvider';
import { TreeViewProvider } from './providers/treeViewProvider';
import { LibraryPanel } from './webview/LibraryPanel';

let libraryService: LibraryService;
let statusBarProvider: StatusBarProvider;
let treeViewProvider: TreeViewProvider;

export function activate(context: vscode.ExtensionContext) {
    console.log('Antigravity Skills Manager is now active!');

    // 初始化服务
    libraryService = new LibraryService();
    statusBarProvider = new StatusBarProvider(libraryService);
    treeViewProvider = new TreeViewProvider(libraryService);

    // 注册树视图
    vscode.window.registerTreeDataProvider('antiSkills.treeView', treeViewProvider);

    // 注册命令
    context.subscriptions.push(
        // 打开技能库面板
        vscode.commands.registerCommand('antiSkills.openLibrary', () => {
            LibraryPanel.createOrShow(context.extensionUri, libraryService);
        }),

        // 部署 Skill (QuickPick)
        vscode.commands.registerCommand('antiSkills.deploySkill', async () => {
            const skills = await libraryService.getSkills();
            if (skills.length === 0) {
                vscode.window.showWarningMessage('没有找到可用的 Skills，请先设置库路径');
                return;
            }

            const selected = await vscode.window.showQuickPick(
                skills.map(s => ({
                    label: `📦 ${s.name}`,
                    description: s.description,
                    detail: s.path,
                    skill: s
                })),
                {
                    placeHolder: '选择要部署的 Skill',
                    matchOnDescription: true
                }
            );

            if (selected) {
                await libraryService.deploySkill(selected.skill);
                vscode.window.showInformationMessage(`✅ 已部署: ${selected.skill.name}`);
                treeViewProvider.refresh();
                statusBarProvider.update();
            }
        }),

        // 部署 Rule (QuickPick)
        vscode.commands.registerCommand('antiSkills.deployRule', async () => {
            const rules = await libraryService.getRules();
            if (rules.length === 0) {
                vscode.window.showWarningMessage('没有找到可用的 Rules，请先设置库路径');
                return;
            }

            const selected = await vscode.window.showQuickPick(
                rules.map(r => ({
                    label: `📜 ${r.name}`,
                    description: r.description,
                    detail: r.path,
                    rule: r
                })),
                {
                    placeHolder: '选择要部署的 Rule',
                    matchOnDescription: true
                }
            );

            if (selected) {
                await libraryService.deployRule(selected.rule);
                vscode.window.showInformationMessage(`✅ 已部署: ${selected.rule.name}`);
                treeViewProvider.refresh();
                statusBarProvider.update();
            }
        }),

        // 刷新
        vscode.commands.registerCommand('antiSkills.refresh', () => {
            libraryService.refresh();
            treeViewProvider.refresh();
            statusBarProvider.update();
            vscode.window.showInformationMessage('已刷新技能库');
        }),

        // 设置库路径
        vscode.commands.registerCommand('antiSkills.setLibraryPath', async () => {
            const uri = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: '选择 Skills/Rules 库目录'
            });

            if (uri && uri[0]) {
                const config = vscode.workspace.getConfiguration('antiSkills');
                await config.update('libraryPath', uri[0].fsPath, vscode.ConfigurationTarget.Global);
                libraryService.refresh();
                treeViewProvider.refresh();
                statusBarProvider.update();
                // 刷新 WebView 面板
                if (LibraryPanel.currentPanel) {
                    LibraryPanel.createOrShow(context.extensionUri, libraryService);
                }
                vscode.window.showInformationMessage(`✅ 库路径已设置: ${uri[0].fsPath}`);
            }
        }),

        // 状态栏
        statusBarProvider.statusBarItem
    );

    // 初始刷新
    libraryService.refresh();
    statusBarProvider.update();
}

export function deactivate() {
    statusBarProvider?.dispose();
}
