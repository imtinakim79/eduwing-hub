#!/bin/bash
# DigitalOcean Droplet 배포 스크립트
# 서버에서 실행: bash deploy.sh

set -e

APP_DIR="/var/www/eduwing-hub"
NGINX_CONF="/etc/nginx/sites-available/eduwing-hub"

echo "=== EduWing Hub 배포 시작 ==="

# 1. Node.js 설치 확인
if ! command -v node &> /dev/null; then
  echo "▶ Node.js 설치 중..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "Node $(node -v) / npm $(npm -v)"

# 2. 앱 디렉토리 준비
mkdir -p $APP_DIR
cp -r . $APP_DIR
cd $APP_DIR

# 3. 의존성 설치 (devDependencies 포함)
echo "▶ 패키지 설치 중..."
npm ci

# 4. 빌드 (메모리 512MB 제한)
echo "▶ 빌드 중... (NODE_OPTIONS=--max-old-space-size=512)"
npm run build:do

# 5. Nginx 설치 및 설정
if ! command -v nginx &> /dev/null; then
  echo "▶ Nginx 설치 중..."
  apt-get install -y nginx
fi

cat > $NGINX_CONF << 'EOF'
server {
    listen 80;
    server_name _;
    root /var/www/eduwing-hub/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
    gzip_min_length 1000;

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

ln -sf $NGINX_CONF /etc/nginx/sites-enabled/eduwing-hub
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo ""
echo "=== 배포 완료 ==="
echo "접속: http://$(curl -s ifconfig.me)"
