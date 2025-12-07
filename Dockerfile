# 1️⃣ Build Stage
FROM gradle:8.5-jdk17 AS builder
WORKDIR /app

COPY . .
RUN gradle clean bootJar --no-daemon

# 2️⃣ Run Stage
FROM amazoncorretto:17-alpine
WORKDIR /app

# builder 단계에서 생성된 jar 복사
COPY --from=builder /app/build/libs/*.jar app.jar

# timezone 설정 (한국 시간)
RUN apk --no-cache add tzdata && \
    cp /usr/share/zoneinfo/Asia/Seoul /etc/localtime

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]