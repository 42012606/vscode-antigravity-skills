import os
import argparse
import datetime
import subprocess
import re

# === 配置：5+1 标准架构 ===
META_DIR = os.path.join("docs", "meta")
FILES_TEMPLATE = {
    "00_CONTEXT.md": """# 📋 Project Context

> **AI 快速索引页**: 阅读代码前请先读取此文件。

## Tech Stack
- **Language**: [待填充]
- **Framework**: [待填充]
- **Database**: [待填充]

## Architecture Snapshot
> 核心数据流与模块职责概述。

## Dev Rules (红线)
1. 遵守关注点分离
2. 禁止跨层调用
3. 新增文件前确认模块归属
""",
    "01_TASKS.md": """# 📅 Tasks

## Current Focus
> 当前正在进行的任务。

## Completed
> 已完成的任务归档。
""",
    "02_ARCHITECTURE.md": """# 🏗️ Architecture

> 运行 `op init` 自动更新文件树。
""",
    "03_CHANGELOG.md": """# 📝 Changelog

## History
""",
    "04_MEMO.md": """# 💡 Memo

> 临时草稿，定期清空。
""",
    "README.md": """# Project Name

> 项目简介

## Quick Start
[待填充]

## Docs
详细文档位于 `docs/meta/`。
"""
}

# === 状态文件 ===
STATE_FILE = os.path.join(META_DIR, ".sop_state")

def get_date():
    return datetime.date.today().strftime("%Y-%m-%d")

def get_timestamp():
    return datetime.datetime.now().strftime("%Y%m%d-%H%M")

def sanitize_branch_name(name):
    """将任务描述转换为合法的分支名"""
    name = re.sub(r'[^a-zA-Z0-9\u4e00-\u9fa5_-]', '-', name)
    name = re.sub(r'-+', '-', name).strip('-')
    return name[:30]  # 限制长度

def get_current_branch():
    """获取当前 Git 分支名"""
    try:
        result = subprocess.check_output(["git", "branch", "--show-current"], stderr=subprocess.DEVNULL)
        return result.decode().strip()
    except:
        return None

def save_state(state):
    """保存 SOP 状态"""
    os.makedirs(META_DIR, exist_ok=True)
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        f.write(state)

def load_state():
    """读取 SOP 状态"""
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            return f.read().strip()
    return "IDLE"

# --- 功能 1: 初始化 (init) ---
def run_init():
    cwd = os.getcwd()
    print(f"🚀 [Init] Enforcing 5+1 Standard in {cwd}...")
    
    # 1. 创建目录
    if not os.path.exists(META_DIR):
        os.makedirs(META_DIR)
        print(f"✅ Created {META_DIR}")
    
    # 2. 生成标准文件 (不覆盖已存在的)
    for name, content in FILES_TEMPLATE.items():
        if name == "README.md":
            path = name
        else:
            path = os.path.join(META_DIR, name)
        
        if not os.path.exists(path):
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"📄 Created {path}")
        else:
            print(f"⏩ Skipped (Exists) {path}")
    
    # 3. 扫描并更新 Architecture Map
    tree_output = []
    exclude_dirs = {".git", ".idea", "__pycache__", "node_modules", "venv", ".gemini", ".agent"}
    for root, dirs, files in os.walk("."):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        level = root.replace(".", "").count(os.sep)
        indent = "    " * level
        tree_output.append(f"{indent}{os.path.basename(root) or '.'}/")
        subindent = "    " * (level + 1)
        for f in files:
            if f.endswith((".md", ".py", ".js", ".ts", ".json", ".sql", ".php", ".txt", ".html", ".css")):
                tree_output.append(f"{subindent}{f}")
    
    arch_path = os.path.join(META_DIR, "02_ARCHITECTURE.md")
    if os.path.exists(arch_path):
        with open(arch_path, "a", encoding="utf-8") as f:
            f.write(f"\n\n### Scan {get_date()}\n```text\n" + "\n".join(tree_output) + "\n```\n")
        print("✅ Updated Architecture Map.")
    
    save_state("IDLE")
    print("✅ Init complete. State: IDLE")

# --- 功能 2: 开始任务 (start) ---
def run_start(content):
    if not content:
        print("❌ Error: 任务描述必填。用法: `op start 新功能描述`")
        return
    
    print("🚀 [Start] Creating task checkpoint...")
    
    # 1. Git pull
    try:
        subprocess.run(["git", "pull", "origin", "main"], check=True)
    except:
        print("⚠️ Git pull failed (可能是新仓库), 继续执行...")
    
    # 2. 创建功能分支
    timestamp = get_timestamp()
    branch_name = f"feat/{timestamp}-{sanitize_branch_name(content)}"
    try:
        subprocess.run(["git", "checkout", "-b", branch_name], check=True)
        print(f"✅ Created branch: {branch_name}")
    except Exception as e:
        print(f"❌ Git branch error: {e}")
        return
    
    # 3. 写入任务令牌
    tasks_path = os.path.join(META_DIR, "01_TASKS.md")
    if os.path.exists(tasks_path):
        with open(tasks_path, "r", encoding="utf-8") as f:
            old_content = f.read()
        
        # 在 Current Focus 下插入新任务
        task_entry = f"- [ ] [{timestamp}] {content}\n"
        if "## Current Focus" in old_content:
            new_content = old_content.replace(
                "## Current Focus\n",
                f"## Current Focus\n{task_entry}"
            )
        else:
            new_content = old_content + f"\n## Current Focus\n{task_entry}"
        
        with open(tasks_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"✅ Task token created: [{timestamp}] {content}")
    
    save_state(f"TASK_ACTIVE|{branch_name}|{timestamp}|{content}")
    print(f"✅ Start complete. State: TASK_ACTIVE")

# --- 功能 3: 记日志 (log) ---
def run_log(content):
    if not content:
        print("❌ Error: 内容必填。用法: `op log 变更描述`")
        return
    
    log_path = os.path.join(META_DIR, "03_CHANGELOG.md")
    if not os.path.exists(log_path):
        print("❌ Error: 文档不存在。请先运行 `op init`。")
        return
    
    entry = f"\n### {get_date()}\n- {content}\n"
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(entry)
    print(f"✅ Logged: {content}")

# --- 功能 4: 完成任务 (done) ---
def run_done(content):
    state = load_state()
    if not state.startswith("TASK_ACTIVE"):
        print("❌ Error: 当前没有活跃任务。请先运行 `op start`。")
        return
    
    parts = state.split("|")
    if len(parts) < 4:
        print("❌ Error: 状态文件损坏。")
        return
    
    _, branch_name, timestamp, task_desc = parts[0], parts[1], parts[2], parts[3]
    
    print("🚀 [Done] Completing task...")
    
    # 1. 更新 TASKS.md (标记完成)
    tasks_path = os.path.join(META_DIR, "01_TASKS.md")
    if os.path.exists(tasks_path):
        with open(tasks_path, "r", encoding="utf-8") as f:
            old_content = f.read()
        
        # 移动任务到 Completed
        task_pattern = f"- [ ] [{timestamp}]"
        task_done = f"- [x] [{timestamp}]"
        new_content = old_content.replace(task_pattern, task_done)
        
        with open(tasks_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print("✅ Task marked as completed.")
    
    # 2. 追加 CHANGELOG
    run_log(content or task_desc)
    
    # 3. Git commit
    try:
        subprocess.run(["git", "add", "."], check=True)
        commit_msg = f"feat: {content or task_desc} (close {timestamp})"
        subprocess.run(["git", "commit", "-m", commit_msg], check=True)
        print(f"✅ Committed: {commit_msg}")
    except Exception as e:
        print(f"⚠️ Git commit: {e}")
    
    # 4. 合并到 main
    try:
        subprocess.run(["git", "checkout", "main"], check=True)
        subprocess.run(["git", "merge", branch_name], check=True)
        print(f"✅ Merged {branch_name} into main.")
    except Exception as e:
        print(f"❌ Git merge error: {e}")
        return
    
    # 5. 推送
    try:
        subprocess.run(["git", "push", "origin", "main"], check=True)
        print("✅ Pushed to origin/main.")
    except Exception as e:
        print(f"⚠️ Git push: {e} (可手动推送)")
    
    # 6. 删除分支
    try:
        subprocess.run(["git", "branch", "-d", branch_name], check=True)
        print(f"✅ Deleted branch: {branch_name}")
    except Exception as e:
        print(f"⚠️ Branch delete: {e}")
    
    save_state("IDLE")
    print("✅ Done complete. State: IDLE")

# --- 功能 5: 快速提交 (commit) - 保留兼容 ---
def run_commit():
    try:
        print("🚀 [Git] Quick commit...")
        subprocess.run(["git", "add", "."], check=True)
        
        status = subprocess.check_output(["git", "status", "--porcelain"]).decode()
        if not status:
            print("🛑 No changes to commit.")
            return
        
        msg = f"chore: update project state ({get_date()})"
        subprocess.run(["git", "commit", "-m", msg], check=True)
        print(f"✅ Committed: {msg}")
    except Exception as e:
        print(f"❌ Git error: {e}")

# --- 主程序入口 ---
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", required=True, choices=["init", "start", "log", "done", "commit"])
    parser.add_argument("--content", default="")
    args = parser.parse_args()
    
    if args.mode == "init":
        run_init()
    elif args.mode == "start":
        run_start(args.content)
    elif args.mode == "log":
        run_log(args.content)
    elif args.mode == "done":
        run_done(args.content)
    elif args.mode == "commit":
        run_commit()
