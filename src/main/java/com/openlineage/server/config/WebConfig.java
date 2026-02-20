package com.openlineage.server.config;

import org.apache.catalina.connector.Connector;
import org.springframework.boot.web.embedded.tomcat.TomcatConnectorCustomizer;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.PathMatchConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.util.UrlPathHelper;

/**
 * Web configuration for handling URL-encoded path parameters on AWS EKS / ALB.
 *
 * Key behaviours:
 * 1. Tomcat is configured to allow encoded slashes (%2F) to pass through
 * without rejecting them with a 400.
 * 2. UrlPathHelper is configured with urlDecode=false so Spring matches paths
 * using the raw encoded URI — this prevents %2F from being decoded to /
 * and breaking path segment matching.
 * 3. PathVariableDecodingInterceptor automatically URL-decodes @PathVariable
 * values so controllers receive decoded strings (e.g. "s3://bucket-name").
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final PathVariableDecodingInterceptor pathVariableDecodingInterceptor;

    public WebConfig(PathVariableDecodingInterceptor pathVariableDecodingInterceptor) {
        this.pathVariableDecodingInterceptor = pathVariableDecodingInterceptor;
    }

    @Override
    public void configurePathMatch(PathMatchConfigurer configurer) {
        UrlPathHelper urlPathHelper = new UrlPathHelper();
        // Do NOT decode URLs for path matching — keeps %2F as-is so Spring
        // doesn't split namespace URIs like s3://... into extra path segments.
        urlPathHelper.setUrlDecode(false);
        // Do NOT deduplicate slashes — namespaces can legitimately contain //
        urlPathHelper.setRemoveSemicolonContent(false);
        configurer.setUrlPathHelper(urlPathHelper);
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // Auto-decode @PathVariable values that arrive encoded due to urlDecode=false
        registry.addInterceptor(pathVariableDecodingInterceptor);
    }

    @Bean
    public WebServerFactoryCustomizer<TomcatServletWebServerFactory> containerCustomizer() {
        return factory -> factory.addConnectorCustomizers(new TomcatConnectorCustomizer() {
            @Override
            public void customize(Connector connector) {
                // Allow special characters in query parameters
                connector.setProperty("relaxedQueryChars", "[]|{}^\\`\"<>");
                // Allow special characters in path segments (needed for encoded namespace
                // values)
                connector.setProperty("relaxedPathChars", "[]|{}^\\`\"<>");
                connector.setURIEncoding("UTF-8");
                // Allow %2F (encoded slashes) to pass through without Tomcat rejecting.
                // DECODE = accept %2F and decode it. With urlDecode=false above,
                // Spring still matches against the raw encoded path.
                connector.setEncodedSolidusHandling(
                        org.apache.tomcat.util.buf.EncodedSolidusHandling.DECODE.getValue());
            }
        });
    }
}
