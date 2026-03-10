package com.openlineage.server.service;

import com.openlineage.server.domain.alation.AlationColumn;
import com.openlineage.server.domain.alation.AlationDataset;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Collections;
import java.util.List;

@Service
public class AlationClientService {

    private final RestTemplate restTemplate;

    public AlationClientService(RestTemplateBuilder restTemplateBuilder,
            @Value("${alation.host:}") String alationHost,
            @Value("${alation.api-token:}") String apiToken) {
        if (alationHost == null || alationHost.isEmpty()) {
            this.restTemplate = restTemplateBuilder.build();
        } else {
            this.restTemplate = restTemplateBuilder
                    .rootUri(alationHost)
                    .defaultHeader("Token", apiToken)
                    .build();
        }
    }

    public List<AlationDataset> getDatasetsBySchema(Long schemaId) {
        if (schemaId == null) {
            return Collections.emptyList();
        }

        String url = UriComponentsBuilder.fromPath("/integration/v2/dataset/")
                .queryParam("schema_id", schemaId)
                .toUriString();

        ResponseEntity<List<AlationDataset>> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<List<AlationDataset>>() {
                });

        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            return response.getBody();
        }
        return Collections.emptyList();
    }

    public AlationDataset getDataset(Long datasetId) {
        if (datasetId == null) {
            return null;
        }

        String url = UriComponentsBuilder.fromPath("/integration/v2/dataset/")
                .queryParam("id", datasetId)
                .toUriString();

        ResponseEntity<List<AlationDataset>> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<List<AlationDataset>>() {
                });

        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null && !response.getBody().isEmpty()) {
            return response.getBody().get(0);
        }
        return null;
    }

    public List<AlationColumn> getColumnsForDataset(Long datasetId) {
        if (datasetId == null) {
            return Collections.emptyList();
        }

        String url = UriComponentsBuilder.fromPath("/integration/v2/column/")
                .queryParam("dataset_id", datasetId)
                .toUriString();

        ResponseEntity<List<AlationColumn>> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<List<AlationColumn>>() {
                });

        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            return response.getBody();
        }
        return Collections.emptyList();
    }

    public List<AlationColumn> getColumnsForSchema(Long schemaId) {
        if (schemaId == null) {
            return Collections.emptyList();
        }

        // Sometimes it's easier to query all datasets in the schema first,
        // but if Alation API allows schema_id on column directly, we use that.
        String url = UriComponentsBuilder.fromPath("/integration/v2/column/")
                .queryParam("schema_id", schemaId)
                .toUriString();

        ResponseEntity<List<AlationColumn>> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<List<AlationColumn>>() {
                });

        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            return response.getBody();
        }
        return Collections.emptyList();
    }
}
