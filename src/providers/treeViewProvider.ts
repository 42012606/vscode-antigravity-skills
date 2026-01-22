import * as vscode from 'vscode';
import { LibraryService, SkillItem, RuleItem } from '../services/libraryService';

type TreeItemData = {
    type: 'category' | 'skill' | 'rule';
    label: string;
    data?: SkillItem | RuleItem;
    children?: TreeItemData[];
};

export class TreeViewProvider implements vscode.TreeDataProvider<TreeItemData> {
    private _onDidChangeTreeData = new vscode.EventEmitter<TreeItemData | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private libraryService: LibraryService) { }

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: TreeItemData): vscode.TreeItem {
        const item = new vscode.TreeItem(
            element.label,
            element.type === 'category'
                ? vscode.TreeItemCollapsibleState.Expanded
                : vscode.TreeItemCollapsibleState.None
        );

        if (element.type === 'skill') {
            item.iconPath = new vscode.ThemeIcon('package');
            item.contextValue = 'skill';
            item.tooltip = (element.data as SkillItem)?.description;
            item.command = {
                command: 'antiSkills.deploySkill',
                title: '部署 Skill'
            };
        } else if (element.type === 'rule') {
            item.iconPath = new vscode.ThemeIcon('file-code');
            item.contextValue = 'rule';
            item.tooltip = (element.data as RuleItem)?.description;
            item.command = {
                command: 'antiSkills.deployRule',
                title: '部署 Rule'
            };
        } else if (element.type === 'category') {
            item.iconPath = new vscode.ThemeIcon('folder');
        }

        return item;
    }

    async getChildren(element?: TreeItemData): Promise<TreeItemData[]> {
        if (!element) {
            // 根节点
            const libPath = this.libraryService.getLibraryPath();
            if (!libPath) {
                return [{
                    type: 'category',
                    label: '⚠️ 请先设置库路径',
                    children: []
                }];
            }

            return [
                {
                    type: 'category',
                    label: '📂 已部署',
                    children: []
                },
                {
                    type: 'category',
                    label: '📦 Skills',
                    children: []
                },
                {
                    type: 'category',
                    label: '📜 Rules',
                    children: []
                }
            ];
        }

        // 子节点
        if (element.label === '📂 已部署') {
            const deployedSkills = this.libraryService.getDeployedSkills();
            const deployedRules = this.libraryService.getDeployedRules();
            return [
                ...deployedSkills.map(s => ({
                    type: 'skill' as const,
                    label: `📦 ${s.name}`,
                    data: s
                })),
                ...deployedRules.map(r => ({
                    type: 'rule' as const,
                    label: `📜 ${r.name}`,
                    data: r
                }))
            ];
        }

        if (element.label === '📦 Skills') {
            const skills = await this.libraryService.getSkills();
            return skills.map(s => ({
                type: 'skill' as const,
                label: s.name,
                data: s
            }));
        }

        if (element.label === '📜 Rules') {
            const rules = await this.libraryService.getRules();
            return rules.map(r => ({
                type: 'rule' as const,
                label: r.name,
                data: r
            }));
        }

        return [];
    }
}
