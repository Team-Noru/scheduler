# Node LTS 이미지 사용
FROM node:20

# 앱 디렉토리 생성
WORKDIR /app

# 패키지 먼저 설치
COPY package.json package-lock.json* ./
RUN npm install

# 소스 전체 복사
COPY . .

# 기본 실행 커맨드
CMD ["node", "src/scheduler.js"]
