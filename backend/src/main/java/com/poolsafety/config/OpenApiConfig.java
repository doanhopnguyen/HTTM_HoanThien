package com.poolsafety.config;

import io.swagger.v3.oas.models.*;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.*;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.*;
import java.util.List;

@Configuration
public class OpenApiConfig {
    @Bean OpenAPI openApi(){
        return new OpenAPI().info(new Info().title("Pool Safety Monitoring API").version("1.0.0")
            .description("Single-pool camera and incident management. AI ingestion uses a separate service key."))
            .components(new Components().addSecuritySchemes("bearerAuth",new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT"))
                .addSecuritySchemes("aiServiceKey",new SecurityScheme().type(SecurityScheme.Type.APIKEY).in(SecurityScheme.In.HEADER).name("X-AI-SERVICE-KEY")))
            .addSecurityItem(new SecurityRequirement().addList("bearerAuth"));
    }
    @Bean OpenApiCustomizer publicAndServiceAuth(){
        return api->{
            for(String path:List.of("/api/auth/login","/api/auth/refresh")){var item=api.getPaths().get(path);if(item!=null&&item.getPost()!=null)item.getPost().setSecurity(List.of());}
            var detection=api.getPaths().get("/api/detection-events");if(detection!=null&&detection.getPost()!=null)detection.getPost().setSecurity(List.of(new SecurityRequirement().addList("aiServiceKey")));
        };
    }
}
