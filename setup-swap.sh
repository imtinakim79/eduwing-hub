#!/bin/bash
# DigitalOcean 1GB Droplet — 2GB Swap 설정 스크립트
# 최초 1회만 실행하면 됩니다.

set -e

SWAP_FILE="/swapfile"
SWAP_SIZE="2G"

echo "=== Swap 설정 시작 ==="

# 이미 swap이 있으면 스킵
if swapon --show | grep -q "$SWAP_FILE"; then
  echo "이미 swap이 활성화되어 있습니다."
  free -h
  exit 0
fi

# swapfile 생성
echo "▶ ${SWAP_SIZE} swapfile 생성 중..."
fallocate -l $SWAP_SIZE $SWAP_FILE
chmod 600 $SWAP_FILE
mkswap $SWAP_FILE
swapon $SWAP_FILE

# 재부팅 후에도 유지되도록 fstab 등록
if ! grep -q "$SWAP_FILE" /etc/fstab; then
  echo "$SWAP_FILE none swap sw 0 0" >> /etc/fstab
fi

# swappiness 조정 (RAM을 최대한 활용, swap은 보조로만)
sysctl vm.swappiness=10
echo "vm.swappiness=10" >> /etc/sysctl.conf

echo ""
echo "=== Swap 설정 완료 ==="
free -h
