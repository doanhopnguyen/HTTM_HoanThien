package com.poolsafety;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.ActiveProfiles;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties="app.dev-sample-data=false") @ActiveProfiles("dev")
class CleanDevSeedIntegrationTest {
    static final EmbeddedPostgres PG;
    static{try{PG=EmbeddedPostgres.builder().start();}catch(Exception e){throw new ExceptionInInitializerError(e);}}
    @DynamicPropertySource static void properties(DynamicPropertyRegistry r){r.add("spring.datasource.url",()->PG.getJdbcUrl("postgres","postgres"));r.add("spring.datasource.username",()->"postgres");r.add("spring.datasource.password",()->"");r.add("app.jwt-secret",()->"development-seed-test-secret-abcdefghijklmnopqrstuvwxyz");r.add("app.ai-service-key",()->"development-seed-ai-key-abcdefghijklmnopqrstuvwxyz");r.add("app.dev-password",()->"Seed-Development-123!");}
    @Autowired JdbcTemplate sql;
    @Autowired com.poolsafety.config.DevSeed seed;
    @Autowired org.springframework.security.crypto.password.PasswordEncoder passwords;
    @Test void cleanSeedCreatesOneUserPerRoleAndNoSampleData() {
        seed.run(new org.springframework.boot.DefaultApplicationArguments(new String[0]));
        assertEquals(2, sql.queryForObject("select count(*) from users", Integer.class));
        for (String role : java.util.List.of("ADMIN", "STAFF")) {
            assertEquals(1, sql.queryForObject("select count(*) from users where role=? and status='ACTIVE'", Integer.class, role));
        }
        for (String table : java.util.List.of("cameras", "detection_events", "incidents", "incident_history", "notifications", "audit_logs", "refresh_tokens")) {
            assertEquals(0, sql.queryForObject("select count(*) from " + table, Integer.class));
        }
        for (String hash : sql.queryForList("select password_hash from users", String.class)) {
            assertTrue(passwords.matches("Seed-Development-123!", hash));
        }
    }
    @AfterAll static void close()throws Exception{PG.close();}
}
