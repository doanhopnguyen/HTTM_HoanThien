package com.poolsafety;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.springframework.boot.SpringApplication;
import java.io.File;
import java.util.Map;

/** Optional developer launcher: a real persistent PostgreSQL without a system installation. */
public class LocalSystemLauncher {
    public static void main(String[] args) throws Exception {
        var directory=new File(System.getenv().getOrDefault("LOCAL_DB_DIR",".runtime/postgres"));directory.mkdirs();
        var pg=EmbeddedPostgres.builder().setDataDirectory(directory).setCleanDataDirectory(false).setPort(5433).start();
        Runtime.getRuntime().addShutdownHook(new Thread(()->{try{pg.close();}catch(Exception ignored){}}));
        var app=new SpringApplication(PoolSafetyApplication.class);
        app.setDefaultProperties(Map.of("spring.datasource.url",pg.getJdbcUrl("postgres","postgres"),"spring.datasource.username","postgres","spring.datasource.password","","spring.profiles.active","dev"));
        app.run(args);
    }
}
