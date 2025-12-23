#!/bin/bash
# Auto-Codex 自动修复脚本
# 用于检测和修复常见运行时问题

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

# 检测应用路径
detect_app_path() {
    if [ -d "/Applications/Auto-Codex.app" ]; then
        echo "/Applications/Auto-Codex.app/Contents/Resources/auto-codex"
    elif [ -d "$HOME/Applications/Auto-Codex.app" ]; then
        echo "$HOME/Applications/Auto-Codex.app/Contents/Resources/auto-codex"
    else
        echo ""
    fi
}

APP_DIR=$(detect_app_path)

if [ -z "$APP_DIR" ]; then
    log_error "未找到 Auto-Codex 应用"
    exit 1
fi

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           Auto-Codex 自动修复工具                              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "应用路径: $APP_DIR"
echo ""

# 检查 1: Python 虚拟环境
check_venv() {
    echo "📌 检查 Python 虚拟环境..."

    if [ ! -f "$APP_DIR/.venv/bin/python" ]; then
        log_warn "虚拟环境不存在，正在创建..."
        cd "$APP_DIR"
        python3 -m venv .venv
        log_info "虚拟环境已创建"
        return 1
    fi

    # 测试 Python 是否可用
    if ! "$APP_DIR/.venv/bin/python" --version > /dev/null 2>&1; then
        log_warn "虚拟环境损坏，正在重建..."
        rm -rf "$APP_DIR/.venv"
        cd "$APP_DIR"
        python3 -m venv .venv
        log_info "虚拟环境已重建"
        return 1
    fi

    log_info "虚拟环境正常"
    return 0
}

# 检查 2: Python 依赖
check_dependencies() {
    echo "📌 检查 Python 依赖..."

    local missing=0

    # 测试关键模块
    if ! "$APP_DIR/.venv/bin/python" -c "from dotenv import load_dotenv" 2>/dev/null; then
        missing=1
    fi

    if [ $missing -eq 1 ]; then
        log_warn "依赖缺失，正在安装..."
        "$APP_DIR/.venv/bin/pip" install -q -r "$APP_DIR/requirements.txt"
        log_info "依赖已安装"
        return 1
    fi

    log_info "依赖正常"
    return 0
}

# 检查 3: .env 配置文件
check_env_file() {
    echo "📌 检查配置文件..."

    if [ ! -f "$APP_DIR/.env" ]; then
        log_warn ".env 文件不存在"

        # 尝试从系统环境变量创建
        if [ -n "$OPENAI_API_KEY" ]; then
            log_info "从系统环境变量创建 .env..."
            cat > "$APP_DIR/.env" << EOF
# Auto-Codex 配置（自动生成）
OPENAI_API_KEY=$OPENAI_API_KEY
PROMPT_LANGUAGE=zh-CN
EOF
            log_info ".env 已创建"
        else
            log_warn "请手动配置 $APP_DIR/.env"
        fi
        return 1
    fi

    log_info "配置文件存在"
    return 0
}

# 执行检查
NEEDS_REPAIR=0

check_venv || NEEDS_REPAIR=1
check_dependencies || NEEDS_REPAIR=1
check_env_file || NEEDS_REPAIR=1

echo ""
if [ $NEEDS_REPAIR -eq 0 ]; then
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                    ✓ 所有检查通过                              ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
else
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                    ✓ 修复完成                                  ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
fi
