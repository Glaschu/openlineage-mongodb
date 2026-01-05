# OpenLineage Ingestion API & Marquez Compatibility Layer

A robust implementation of the OpenLineage Ingestion API using Spring Boot 3+ and MongoDB. This project also features a comprehensive Marquez Compatibility Layer, serving as a drop-in replacement for the core Marquez API and enabling the use of the Marquez Web UI for lineage visualization.

## Key Features

### 1. OpenLineage Ingestion
*   Full support for the OpenLineage specification (`RunEvent`, `Job`, `Dataset`).
*   **Polymorphic Facets**: Strongly typed handling for standard facets (`SchemaDatasetFacet`, `ColumnLineageDatasetFacet`) with custom deserialization.
*   **Governance**: Namespace registry with ownership tracking and access control. New namespaces are auto-registered as "Unclaimed".

### 2. Marquez API Compatibility
This project implements the core endpoints required by the Marquez Web UI, allowing it to function as a backend replacement:
*   **Namespaces API**: CRUD operations (`/api/v1/namespaces`).
*   **Jobs API**: Listing and details (`/api/v1/jobs`), including pagination and global listing.
*   **Datasets API**: Management of datasets and fields (`/api/v1/datasets`).
*   **Runs API**: Lifecycle management (`start`, `complete`, `fail`, `abort`) and facet retrieval.
*   **Lineage API**: Graph traversal endpoints (`/api/v1/lineage`, `/api/v1/column-lineage`) for visualization.
*   **Tags API**: Tagging support for datasets (`/api/v1/tags`).

### 3. Statistics & Analytics
*   **Stats API**: Custom endpoints (`/api/v1/stats`) providing:
    *   Hourly lineage event activity (start/complete/fail).
    *   Cumulative counts for Jobs, Datasets, and Sources.

### 4. Architecture
*   **Storage**: MongoDB for scalable event storage and entity normalization (`jobs`, `datasets` collections).
*   **Search**: Efficient querying for lineage graphs and job/dataset lookups.

## Technologies
*   **Language**: Java 17
*   **Framework**: Spring Boot 3
*   **Database**: MongoDB
*   **Build Tool**: Maven
*   **Containerization**: Docker & Docker Compose

## Prerequisites
*   Java 17+ installed.
*   Docker & Docker Compose installed.
*   Maven installed.

## Getting Started

### Using Docker Compose (Recommended)
The easiest way to run the full stack (API + Database + UI) is via Docker Compose.

```bash
docker-compose up --build
```

*   **API**: `http://localhost:8080/api/v1`
*   **Web UI**: `http://localhost:3000`

### Local Development

1.  **Start MongoDB**: Ensure a MongoDB instance is running on `localhost:27017`.
2.  **Build the Project**:
    ```bash
    mvn clean package
    ```
3.  **Run the Application**:
    ```bash
    mvn spring-boot:run
    ```

## Testing
The project includes a comprehensive suite of integration tests verifying API parity with Marquez.

```bash
mvn test
```

## API Documentation
*   **OpenLineage Spec**: [https://openlineage.io/](https://openlineage.io/)
*   **Marquez API**: [https://marquezproject.github.io/marquez/openapi.html](https://marquezproject.github.io/marquez/openapi.html)

## Project Structure
*   `src/main/java/com/openlineage/server`: Core application source code.
    *   `domain`: POJOs and Records for OpenAPI objects.
    *   `storage`: MongoDB documents and repositories.
    *   `service`: Business logic for ingestion and governance.
    *   `api`: REST Controllers for API endpoints.
*   `ogmarquz`: Submodule containing the Marquez Web UI.
