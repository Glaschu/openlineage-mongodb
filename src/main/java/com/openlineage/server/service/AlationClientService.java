package com.openlineage.server.service;

import com.openlineage.server.domain.alation.AlationColumn;
import com.openlineage.server.domain.alation.AlationDataset;
import com.openlineage.server.domain.alation.AlationSchema;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
@ConditionalOnProperty(name = "alation.host")
public class AlationClientService {

    private static final Logger log = LoggerFactory.getLogger(AlationClientService.class);

    private final RestTemplate restTemplate;
    private final String alationHost;
    private final int pageSize;

    // Token management
    private final String refreshToken;
    private volatile String accessToken;

    public AlationClientService(RestTemplateBuilder restTemplateBuilder,
            @Value("${alation.host}") String alationHost,
            @Value("${alation.api-token:}") String apiToken,
            @Value("${alation.refresh-token:}") String refreshToken,
            @Value("${alation.page-size:100}") int pageSize) {
        this.alationHost = alationHost;
        this.pageSize = Math.min(pageSize, 1000); // Alation hard limit is 1000
        this.refreshToken = refreshToken;
        this.accessToken = apiToken;

        // Build a RestTemplate without a default Token header — we set it per-request
        // so that refreshed tokens are picked up automatically.
        this.restTemplate = restTemplateBuilder
                .rootUri(alationHost)
                .build();

        log.info("AlationClientService initialized with host: {}, pageSize: {}, refreshTokenConfigured: {}",
                alationHost, this.pageSize, (refreshToken != null && !refreshToken.isEmpty()));
    }

    // ── Public API ──────────────────────────────────────────────

    /**
     * Get all schemas for a given data source ID.
     * Uses GET /integration/v2/schema/?ds_id={dsId}
     */
    public List<AlationSchema> getSchemasByDsId(Long dsId) {
        if (dsId == null) {
            return Collections.emptyList();
        }

        String url = UriComponentsBuilder.fromPath("/integration/v2/schema/")
                .queryParam("ds_id", dsId)
                .queryParam("limit", pageSize)
                .toUriString();

        List<AlationSchema> results = fetchAllPages(url, new ParameterizedTypeReference<>() {
        });
        log.debug("Fetched {} schemas for dsId={}", results.size(), dsId);
        return results;
    }

    /**
     * Get tables for a given schema ID.
     * Uses GET /integration/v2/table/?schema_id={schemaId}
     */
    public List<AlationDataset> getTablesBySchema(Long schemaId) {
        if (schemaId == null) {
            return Collections.emptyList();
        }

        String url = UriComponentsBuilder.fromPath("/integration/v2/table/")
                .queryParam("schema_id", schemaId)
                .queryParam("limit", pageSize)
                .toUriString();

        List<AlationDataset> results = fetchAllPages(url, new ParameterizedTypeReference<>() {
        });
        log.debug("Fetched {} tables for schemaId={}", results.size(), schemaId);
        return results;
    }

    /**
     * Get columns for a specific table.
     * Uses GET /integration/v2/column/?table_id={tableId}
     */
    public List<AlationColumn> getColumnsForTable(Long tableId) {
        if (tableId == null) {
            return Collections.emptyList();
        }

        String url = UriComponentsBuilder.fromPath("/integration/v2/column/")
                .queryParam("table_id", tableId)
                .queryParam("limit", pageSize)
                .toUriString();

        List<AlationColumn> results = fetchAllPages(url, new ParameterizedTypeReference<>() {
        });
        log.debug("Fetched {} columns for tableId={}", results.size(), tableId);
        return results;
    }

    /**
     * Search for tables matching a given name within a specific schema.
     * This avoids bulk-loading all tables for large schemas.
     * Uses GET /integration/v2/table/?schema_id={schemaId}&name={name}
     */
    public List<AlationDataset> searchTablesByName(Long schemaId, String name) {
        if (schemaId == null || name == null || name.isEmpty()) {
            return Collections.emptyList();
        }

        String url = UriComponentsBuilder.fromPath("/integration/v2/table/")
                .queryParam("schema_id", schemaId)
                .queryParam("name", name)
                .queryParam("limit", pageSize)
                .encode()
                .toUriString();

        log.info("Alation table search: schemaId={}, name='{}', url='{}'", schemaId, name, url);
        List<AlationDataset> results = fetchAllPages(url, new ParameterizedTypeReference<>() {
        });
        log.info("Searched Alation tables for name='{}' in schemaId={}: {} results", name, schemaId, results.size());
        return results;
    }

    // ── Pagination ──────────────────────────────────────────────

    /**
     * Fetches all pages of results from an Alation API endpoint.
     * Alation paginates via the X-Next-Page response header which contains
     * the relative URL for the next page. When the header is absent, there
     * are no more pages.
     */
    private <T> List<T> fetchAllPages(String initialUrl, ParameterizedTypeReference<List<T>> typeRef) {
        List<T> allResults = new ArrayList<>();
        String currentUrl = initialUrl;

        try {
            while (currentUrl != null) {
                ResponseEntity<List<T>> response = executeWithAuth(currentUrl, typeRef);

                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    allResults.addAll(response.getBody());
                } else {
                    break;
                }

                // Alation returns the next page URL in the X-Next-Page header
                String nextPage = response.getHeaders().getFirst("X-Next-Page");
                if (nextPage != null && !nextPage.isEmpty()) {
                    // X-Next-Page is a relative path like
                    // /integration/v2/schema/?skip=100&limit=100
                    currentUrl = nextPage;
                    log.debug("Following X-Next-Page: {}", nextPage);
                } else {
                    currentUrl = null;
                }
            }
        } catch (Exception e) {
            log.error("Error during paginated fetch starting from URL: {}", initialUrl, e);
        }

        return allResults;
    }

    // ── Auth & Request Execution ────────────────────────────────

    /**
     * Execute a GET request with the current access token. If a 401 is received
     * and a refresh token is configured, attempt to refresh the access token
     * and retry the request once.
     */
    private <T> ResponseEntity<T> executeWithAuth(String url, ParameterizedTypeReference<T> typeRef) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Token", accessToken);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            return restTemplate.exchange(url, HttpMethod.GET, entity, typeRef);
        } catch (HttpClientErrorException.Unauthorized e) {
            // 401 — try refreshing the token if we have a refresh token
            if (refreshToken != null && !refreshToken.isEmpty()) {
                log.info("Received 401 from Alation, attempting token refresh...");
                if (refreshAccessToken()) {
                    // Retry with the new token
                    HttpHeaders retryHeaders = new HttpHeaders();
                    retryHeaders.set("Token", accessToken);
                    HttpEntity<Void> retryEntity = new HttpEntity<>(retryHeaders);
                    return restTemplate.exchange(url, HttpMethod.GET, retryEntity, typeRef);
                }
            }
            throw e; // Re-throw if refresh not available or failed
        }
    }

    /**
     * Refresh the API access token using the long-lived refresh token.
     * Calls POST /integration/v1/createAPIAccessToken/ per Alation docs.
     *
     * @return true if the token was successfully refreshed
     */
    private synchronized boolean refreshAccessToken() {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_FORM_URLENCODED);

            MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
            body.add("refresh_token", refreshToken);
            body.add("user_id", "1"); // Admin user — can be made configurable if needed

            HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                    "/integration/v1/createAPIAccessToken/",
                    HttpMethod.POST,
                    request,
                    Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Object token = response.getBody().get("api_access_token");
                if (token != null) {
                    this.accessToken = token.toString();
                    log.info("Alation API access token refreshed successfully");
                    return true;
                }
            }
            log.warn("Token refresh response did not contain api_access_token");
        } catch (Exception e) {
            log.error("Failed to refresh Alation API access token", e);
        }
        return false;
    }
}
