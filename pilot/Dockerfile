# Stage 1: Build
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app
# Copier l'pom.xml w les sources
COPY pom.xml .
COPY src ./src
# Buildi l'projet (Skip tests bach yzreb)
RUN mvn clean package -DskipTests

# Stage 2: Run
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
# Jib l'fichier .jar mn Stage 1
COPY --from=build /app/target/*.jar app.jar
# L'port li 3zelna
EXPOSE 6225
# Lancer l'app
ENTRYPOINT ["java", "-jar", "app.jar"]