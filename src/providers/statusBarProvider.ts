import * as vscode from 'vscode';
import { LibraryService } from '../services/libraryService';

export class StatusBarProvider {
    public statusBarItem: vscode.StatusBarItem;

    constructor(private libraryService: LibraryService) {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = 'antiSkills.openLibrary';
        this.statusBarItem.tooltip = '🛠️ Skills Manager - 点击打开技能库';
        this.update();
        this.statusBarItem.show();
    }

    async update(): Promise<void> {
        const skills = await this.libraryService.getSkills();
        const rules = await this.libraryService.getRules();
        const deployedSkills = this.libraryService.getDeployedSkills();
        const deployedRules = this.libraryService.getDeployedRules();

        const libPath = this.libraryService.getLibraryPath();

        if (!libPath) {
            this.statusBarItem.text = '$(gear) 设置 Skills 库';
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        } else {
            this.statusBarItem.text = `$(package) ${deployedSkills.length}/${skills.length} $(file-code) ${deployedRules.length}/${rules.length}`;
            this.statusBarItem.backgroundColor = undefined;
        }
    }

    dispose(): void {
        this.statusBarItem.dispose();
    }
}
