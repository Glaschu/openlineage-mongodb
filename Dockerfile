FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

# Security: Run as non-root user
RUN groupadd -r openlineage && useradd -r -g openlineage openlineage
RUN chown -R openlineage:openlineage /app
USER openlineage

EXPOSE 5000
ENTRYPOINT ["java", "-jar", "app.jar"]
