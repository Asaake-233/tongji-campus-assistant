#!/bin/sh
# 快捷入口：把状态目录固定到插件用的那一份，避免终端和插件看到两套登录态。
set -e
export TONGJI_ONLINE_HOME="${TONGJI_ONLINE_HOME:-$HOME/.dsh/state/tongji-online}"
export TONGJI_ONLINE_CHROME_SANDBOX="${TONGJI_ONLINE_CHROME_SANDBOX:-0}"
cd "$(dirname "$0")"
exec node scripts/run.mjs "$@"
