package com.openlineage.server.config;

import org.apache.catalina.connector.Connector;
import org.springframework.boot.web.embedded.tomcat.TomcatConnectorCustomizer;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.PathMatchConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.util.UrlPathHelper;

/**
 * Web configuration for handling URL-encoded path parameters on AWS EKS / ALB.
 *
 * Key behaviours:
 * 1. Tomcat is configured to allow encoded slashes (%2F) and other special
 *    characters through to Spring — without this, Tomcat rejects them with a 400.
 * 2. UrlPathHelper is configured to decode URLs so that @PathVariable values
 *    arrive as the decoded original string (e.g. "postgres://users-db").
 * 3. Slash-deduplication is disabled so paths like /namespaces/a//b are not
 *    silently collapsed.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void configurePathMatch(PathMatchConfigurer configurer) {
        UrlPathHelper urlPathHelper = new UrlPathHelper();
        // Decode URL so @PathVariable gets the original string
        urlPathHelper.setUrlDecode(true);
        // Do NOT deduplicate slashes — namespaces can legitimately contain //
        urlPathHelper.setRemoveSemicolonContent(false);
        configurer.setUrlPathHelper(urlPathHelper);
    }

    @Bean
    public WebServerFactoryCustomizer<TomcatServletWebServerFactory> containerCustomizer() {
        return factory -> factory.addConnectorCustomizers(new TomcatConnectorCustomizer() {
            @Override
            public void customize(Connector connector) {
                // Allow special characters in query parameters
                connector.setProperty("relaxedQueryChars", "[]|{}^\\`\"<>");
                // Allow special characters in path segments (needed for encoded namespace values)
                connector.setProperty("relaxedPathChars", "[]|{}^\\`\"<>");
                connector.setURIEncoding("UTF-8");
                // Critical: Allow %2F (encoded slashes) to pass through without
                // Tomcat rejecting them. Without this, requests like
                // /api/v2/namespaces/postgres%3A%2F%2Fusers-db/jobs return 400.
                connector.setProperty("org.apache.tomcat.util.buf.UDecoder.ALLOW_ENCODED_SLASH", "true");
                // Do not reject encoded backslash either
                connector.setProperty("org.apache.tomcat.util.buf.UDecoder.ALLOW_ENCODED_BACKSLASH", "true");
            }
        });
    }
}
