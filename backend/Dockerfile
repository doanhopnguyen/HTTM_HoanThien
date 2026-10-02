FROM maven:3.9.11-eclipse-temurin-25 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src src
RUN mvn -B -DskipTests package
FROM eclipse-temurin:25-jre
WORKDIR /app
RUN groupadd --system poolsafety && useradd --system --gid poolsafety poolsafety
COPY --from=build /app/target/pool-safety-1.0.0.jar app.jar
USER poolsafety
EXPOSE 8080
ENTRYPOINT ["java","-jar","app.jar"]
