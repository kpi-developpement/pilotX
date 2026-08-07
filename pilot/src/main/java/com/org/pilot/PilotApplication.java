package com.org.pilot; // <- Kheli l'package dyalk hna

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

@SpringBootApplication
public class PilotApplication {

	public static void main(String[] args) {
		// N-lanciw l'creation dyal l'DB 9bel may-demarri Spring Boot
		createDatabaseIfNotExists();

		// 3ad n-kheliw Spring Boot y-demarri
		SpringApplication.run(PilotApplication.class, args);
	}

	private static void createDatabaseIfNotExists() {
		// Kan-jbdou les variables mn Docker (Environment variables)
		String url = System.getenv("SPRING_DATASOURCE_URL");
		String user = System.getenv("SPRING_DATASOURCE_USERNAME");
		String pass = System.getenv("SPRING_DATASOURCE_PASSWORD");

		if (url != null && user != null && pass != null) {
			try {
				// Kan-jbdou s-smiya dyal DB (ex: pilotdb) w kan-bdlou l'URL bach n-connectaw l'DB par defaut 'postgres'
				String dbName = url.substring(url.lastIndexOf('/') + 1);
				if (dbName.contains("?")) dbName = dbName.substring(0, dbName.indexOf('?'));

				String baseUrl = url.substring(0, url.lastIndexOf('/')) + "/postgres";

				// Kan-connectaw b JDBC standard
				Connection connection = DriverManager.getConnection(baseUrl, user, pass);
				Statement statement = connection.createStatement();

				// N9albou wesh l'DB kayna
				ResultSet resultSet = statement.executeQuery("SELECT count(*) FROM pg_database WHERE datname = '" + dbName + "'");
				resultSet.next();
				int count = resultSet.getInt(1);

				if (count <= 0) {
					// Ila makantch, n-creyiwha f l'serveur lkbir!
					statement.executeUpdate("CREATE DATABASE " + dbName);
					System.out.println("✅ [PILOT-X] Database '" + dbName + "' created automatically!");
				} else {
					System.out.println("⚡ [PILOT-X] Database '" + dbName + "' already exists. Proceeding...");
				}

				statement.close();
				connection.close();
			} catch (Exception e) {
				System.out.println("⚠️ [PILOT-X] Could not auto-create DB (Maybe no CREATEDB privilege?): " + e.getMessage());
			}
		}
	}
}