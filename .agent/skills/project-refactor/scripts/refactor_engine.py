import os
import sys
import argparse
import datetime
import shutil
import json

# === 配置 ===
META_DIR = os.path.join("docs", "meta")
TESTS_DIR = "tests"
LOG_FILE = os.path.join(META_DIR, ".refactor_log")

# 共享模板目录 (相对于脚本位置)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATES_DIR = os.path.join(SCRIPT_DIR, "..", "..", "shared-templates")

# 测试脚本匹配规则
TEST_PATTERNS = {
    "test_": TESTS_DIR,           # test_*.py → tests/
    "_test.py": TESTS_DIR,        # *_test.py → tests/
    "temp": os.path.join(TESTS_DIR, "_temp"),    # temp*.py → tests/_temp/
    "debug": os.path.join(TESTS_DIR, "_debug"),  # debug*.py → tests/_debug/
}

# 排除目录
EXCLUDE_DIRS = {".git", ".idea", "__pycache__", "node_modules", "venv", ".gemini", ".agent", "tests"}

# 模板文件映射 (目标文件名 -> 模板文件名)
TEMPLATE_FILES = {
    "AI_MAP.md": "AI_MAP.md",
    "DECISION_LOG.md": "DECISION_LOG.md",
    "TASKS.md": "TASKS.md",
    "MEMO.md": "MEMO.md",
}

# README 单独处理 (放在项目根目录)
README_TEMPLATE = "README.md"


def load_template(template_name):
    """从共享模板目录加载模板内容"""
    template_path = os.path.join(TEMPLATES_DIR, template_name)
    if os.path.exists(template_path):
        with open(template_path, "r", encoding="utf-8") as f:
            return f.read()
    else:
        log(f"⚠️ 模板文件不存在: {template_path}")
        return f"# {template_name}\n\n> 模板文件缺失，请检查 shared-templates 目录。\n"

def get_timestamp():
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

def log(message):
    """写入日志"""
    print(message)
    try:
        os.makedirs(META_DIR, exist_ok=True)
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(f"[{get_timestamp()}] {message}\n")
    except Exception as e:
        print(f"⚠️ 日志写入失败: {e}")

def error_exit(message):
    """错误退出"""
    log(f"❌ ERROR: {message}")
    sys.exit(1)

# === 模式 1: 扫描 (scan) ===
def run_scan():
    """扫描项目结构，输出报告"""
    log("🔍 [Scan] 开始扫描项目结构...")
    
    report = {
        "directories": [],
        "test_scripts": [],
        "docs_status": {},
        "file_count": 0,
    }
    
    # 1. 扫描目录结构
    for root, dirs, files in os.walk("."):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        rel_root = os.path.relpath(root, ".")
        
        # 统计文件数
        code_files = [f for f in files if f.endswith((".py", ".js", ".ts", ".php", ".sql"))]
        if code_files:
            report["directories"].append({
                "path": rel_root,
                "file_count": len(code_files),
            })
            report["file_count"] += len(code_files)
        
        # 查找测试脚本
        for f in files:
            if f.endswith(".py"):
                for pattern in TEST_PATTERNS.keys():
                    if pattern in f.lower():
                        report["test_scripts"].append({
                            "name": f,
                            "path": os.path.join(rel_root, f),
                            "pattern": pattern,
                        })
                        break
    
    # 2. 检查文档状态
    report["docs_status"]["README.md"] = os.path.exists("README.md")
    report["docs_status"]["docs/meta/"] = os.path.isdir(META_DIR)
    report["docs_status"]["tests/"] = os.path.isdir(TESTS_DIR)
    
    # 3. 输出报告
    print("\n" + "="*60)
    print("📊 **项目扫描报告**")
    print("="*60)
    
    print("\n1. 目录结构:")
    for d in report["directories"][:10]:  # 最多显示10个
        print(f"   - {d['path']}/ ({d['file_count']} files)")
    if len(report["directories"]) > 10:
        print(f"   ... 共 {len(report['directories'])} 个目录")
    
    print(f"\n2. 发现的测试脚本 ({len(report['test_scripts'])} 个):")
    for s in report["test_scripts"]:
        print(f"   - {s['path']}")
    if not report["test_scripts"]:
        print("   (无)")
    
    print("\n3. 文档状态:")
    for k, v in report["docs_status"].items():
        status = "✅ 存在" if v else "❌ 不存在"
        print(f"   - {k}: {status}")
    
    print("\n" + "="*60)
    
    # 保存报告
    report_file = os.path.join(META_DIR, ".scan_report.json")
    os.makedirs(META_DIR, exist_ok=True)
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    log(f"✅ 扫描完成，报告保存到 {report_file}")
    
    return report

# === 模式 2: 生成文档 (docs) ===
def run_docs():
    """生成标准文档结构"""
    log("📄 [Docs] 开始生成文档结构...")
    
    # 1. 创建目录
    if not os.path.exists(META_DIR):
        os.makedirs(META_DIR)
        log(f"✅ 创建目录: {META_DIR}")
    
    # 2. 生成 docs/meta/ 下的文档 (不覆盖已存在的)
    created = []
    skipped = []
    
    for target_name, template_name in TEMPLATE_FILES.items():
        path = os.path.join(META_DIR, target_name)
        if not os.path.exists(path):
            content = load_template(template_name)
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            created.append(target_name)
        else:
            skipped.append(target_name)
    
    # 3. 生成项目根目录 README (不覆盖)
    readme_path = "README.md"
    if not os.path.exists(readme_path):
        content = load_template(README_TEMPLATE)
        with open(readme_path, "w", encoding="utf-8") as f:
            f.write(content)
        created.append("README.md (root)")
    else:
        skipped.append("README.md (root)")
    
    # 4. 在 AI_MAP.md 中追加文件树
    ai_map_path = os.path.join(META_DIR, "AI_MAP.md")
    tree_output = generate_file_tree()
    if os.path.exists(ai_map_path):
        with open(ai_map_path, "a", encoding="utf-8") as f:
            f.write(f"\n\n## 5. 📂 File Tree (Auto-Generated)\n\n```text\n{tree_output}\n```\n")
        log("✅ 已追加文件树到 AI_MAP.md")
    
    log(f"✅ 创建文件: {created}")
    log(f"⏩ 跳过文件: {skipped}")
    log("✅ 文档生成完成")

def generate_file_tree():
    """生成文件树"""
    lines = []
    for root, dirs, files in os.walk("."):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        level = root.replace(".", "").count(os.sep)
        indent = "    " * level
        lines.append(f"{indent}{os.path.basename(root) or '.'}/")
        subindent = "    " * (level + 1)
        for f in files:
            if f.endswith((".md", ".py", ".js", ".ts", ".json", ".sql", ".php", ".txt", ".html", ".css")):
                lines.append(f"{subindent}{f}")
    return "\n".join(lines)

# === 模式 3: 收纳测试脚本 (tidy) ===
def run_tidy():
    """收纳测试脚本"""
    log("🧹 [Tidy] 开始收纳测试脚本...")
    
    # 读取扫描报告
    report_file = os.path.join(META_DIR, ".scan_report.json")
    if not os.path.exists(report_file):
        log("⚠️ 未找到扫描报告，先执行扫描...")
        run_scan()
    
    with open(report_file, "r", encoding="utf-8") as f:
        report = json.load(f)
    
    test_scripts = report.get("test_scripts", [])
    if not test_scripts:
        log("✅ 没有需要收纳的测试脚本")
        return
    
    # 移动文件
    moved = []
    errors = []
    
    for script in test_scripts:
        src = script["path"]
        pattern = script["pattern"]
        dest_dir = TEST_PATTERNS.get(pattern, TESTS_DIR)
        
        # 跳过已在 tests/ 目录的
        if src.startswith("tests"):
            continue
        
        # 创建目标目录
        os.makedirs(dest_dir, exist_ok=True)
        
        # 移动文件
        dest = os.path.join(dest_dir, script["name"])
        try:
            if os.path.exists(src):
                shutil.move(src, dest)
                moved.append(f"{src} → {dest}")
                log(f"✅ 移动: {src} → {dest}")
            else:
                errors.append(f"源文件不存在: {src}")
        except Exception as e:
            errors.append(f"移动失败 {src}: {e}")
    
    if errors:
        for e in errors:
            log(f"⚠️ {e}")
    
    log(f"✅ 收纳完成，移动 {len(moved)} 个文件")

# === 模式 4: 一键执行 (all) ===
def run_all():
    """一键执行全部操作"""
    log("🚀 [All] 开始执行完整重构流程...")
    
    run_scan()
    run_docs()
    run_tidy()
    
    log("="*60)
    log("✅ 重构完成！")
    log("建议下一步：运行 `开始` 进入 project-sop 初始化。")
    log("="*60)

# === 主程序入口 ===
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="项目重构工具")
    parser.add_argument("--mode", required=True, choices=["scan", "docs", "tidy", "all"],
                        help="执行模式: scan=扫描, docs=生成文档, tidy=收纳测试, all=全部")
    args = parser.parse_args()
    
    try:
        if args.mode == "scan":
            run_scan()
        elif args.mode == "docs":
            run_docs()
        elif args.mode == "tidy":
            run_tidy()
        elif args.mode == "all":
            run_all()
    except Exception as e:
        error_exit(str(e))
