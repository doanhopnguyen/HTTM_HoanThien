import java.sql.*;
import java.util.*;

// Run with the backend JDBC driver on the classpath and DB_* environment variables.
class LocalDatabase {
    public static void main(String[] args) throws Exception {
        String url = System.getenv("DB_URL");
        if (!"jdbc:postgresql://localhost:5432/pool_safety".equals(url))
            throw new IllegalArgumentException("Only localhost:5432/pool_safety is supported.");
        Properties props = new Properties();
        props.setProperty("user", System.getenv("DB_USER"));
        props.setProperty("password", System.getenv("DB_PASSWORD"));
        try (Connection c = DriverManager.getConnection("jdbc:postgresql://localhost:5432/postgres", props);
             Statement s = c.createStatement()) {
            boolean exists;
            try (ResultSet r = s.executeQuery("SELECT 1 FROM pg_database WHERE datname='pool_safety'")) {
                exists = r.next();
                if (!exists) {
                    if (args.length == 0 || !args[0].equals("reset")) {
                        System.out.println("pool_safety does not exist yet.");
                        return;
                    }
                } else {
                    System.out.println("pool_safety exists.");
                }
            }
            if (!exists && args.length > 0 && args[0].equals("reset")) {
                s.execute("CREATE DATABASE pool_safety");
            }
        }
        try (Connection c = DriverManager.getConnection(url, props); Statement s = c.createStatement()) {
            if (args.length > 0 && args[0].equals("reset")) {
                c.setAutoCommit(false);
                s.execute("DROP SCHEMA IF EXISTS public CASCADE");
                s.execute("CREATE SCHEMA public");
                c.commit();
                System.out.println("Reset public schema, including Flyway history. Start the backend to recreate tables and accounts.");
            }
            List<String> tables = new ArrayList<>();
            try (ResultSet r = s.executeQuery("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> 'flyway_schema_history' ORDER BY tablename")) {
                while (r.next()) tables.add(r.getString(1));
            }
            for (String table : tables) {
                try (ResultSet r = s.executeQuery("SELECT count(*) FROM \"public\".\"" + table.replace("\"", "\"\"") + "\"")) {
                    r.next();
                    System.out.println(table + "=" + r.getLong(1));
                }
            }
        }
    }
}
