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

@SpringBootTest @ActiveProfiles("dev")
class DevSeedIntegrationTest {
    static final EmbeddedPostgres PG;
    static{try{PG=EmbeddedPostgres.builder().start();}catch(Exception e){throw new ExceptionInInitializerError(e);}}
    @DynamicPropertySource static void properties(DynamicPropertyRegistry r){r.add("spring.datasource.url",()->PG.getJdbcUrl("postgres","postgres"));r.add("spring.datasource.username",()->"postgres");r.add("spring.datasource.password",()->"");r.add("app.jwt-secret",()->"development-seed-test-secret-abcdefghijklmnopqrstuvwxyz");r.add("app.ai-service-key",()->"development-seed-ai-key-abcdefghijklmnopqrstuvwxyz");r.add("app.dev-password",()->"Seed-Development-123!");}
    @Autowired JdbcTemplate sql;
    @Test void developmentSeedHasConsistentStatesAndTimeline(){
        assertEquals(4,sql.queryForObject("select count(*) from users",Integer.class));assertEquals(6,sql.queryForObject("select count(*) from cameras",Integer.class));assertEquals(10,sql.queryForObject("select count(*) from detection_events",Integer.class));assertEquals(10,sql.queryForObject("select count(*) from incidents",Integer.class));
        assertEquals(3,sql.queryForObject("select count(*) from incidents where status in ('NEW','ACKNOWLEDGED','IN_PROGRESS')",Integer.class));
        assertEquals(0,sql.queryForObject("select count(*) from incidents i where i.status <> (select h.to_status from incident_history h where h.incident_id=i.id order by h.created_at desc limit 1)",Integer.class));
        assertEquals(40,sql.queryForObject("select count(*) from notifications",Integer.class));
    }
    @AfterAll static void close()throws Exception{PG.close();}
}
