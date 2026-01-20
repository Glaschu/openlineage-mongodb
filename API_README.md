# OpenLineage API Documentation

This document describes the API endpoints exposed by the OpenLineage server (compatible with Marquez API).

## Base URL
`/api/v1`

## Endpoints

### 1. Events (Lineage Ingestion)
**Endpoint**: `/lineage`
- **Method**: `POST`
- **Description**: Ingests OpenLineage Run Events. This is the primary intake for lineage data.
- **Body**: `RunEvent` (OpenLineage Standard Event)
- **Returns**: `201 Created`

### 2. Namespaces
**Endpoint**: `/namespaces`
- **Method**: `GET`
- **Description**: Lists all namespaces.
- **Returns**: 
  ```json
  {
    "namespaces": [ { "name": "...", "createdAt": "...", "ownerName": "...", "description": "..." } ]
  }
  ```

**Endpoint**: `/namespaces/{namespace}`
- **Method**: `GET`, `PUT`, `DELETE`
- **Description**: Manage specific namespaces.

### 3. Jobs
**Endpoint**: `/jobs`
- **Method**: `GET`
- **Params**: `limit` (default 10), `offset` (default 0)
- **Description**: List all jobs across all namespaces.
- **Returns**: 
  ```json
  { 
    "jobs": [ { "id": { "namespace": "...", "name": "..." }, "name": "...", ... } ],
    "totalCount": 100
  }
  ```

**Endpoint**: `/namespaces/{namespace}/jobs`
- **Method**: `GET`
- **Description**: List jobs within a specific namespace.

**Endpoint**: `/namespaces/{namespace}/jobs/{jobName}`
- **Method**: `GET`, `PUT`, `DELETE`
- **Description**: Get, update, or delete a specific job.

### 4. Runs
**Endpoint**: `/namespaces/{namespace}/jobs/{jobName}/runs`
- **Method**: `GET`
- **Description**: List runs for a specific job.
- **Returns**:
  ```json
  {
    "runs": [ 
      { 
        "id": "uuid", 
        "createdAt": "...", 
        "state": "COMPLETED", 
        "inputs": [], 
        "outputs": [] 
      } 
    ]
  }
  ```

**Endpoint**: `/runs/{runId}`
- **Method**: `GET`
- **Description**: Get details of a specific run.

**Endpoint**: `/jobs/runs/{runId}/{action}`
- **Actions**: `start`, `complete`, `fail`, `abort`
- **Method**: `POST`
- **Description**: Manually trigger lifecycle status updates for a run.

### 5. Datasets
**Endpoint**: `/namespaces/{namespace}/datasets`
- **Method**: `GET`
- **Description**: List datasets in a namespace.

**Endpoint**: `/namespaces/{namespace}/datasets/{datasetName}`
- **Method**: `GET`, `PUT`, `DELETE`
- **Description**: Manage a specific dataset.

**Endpoint**: `/namespaces/{namespace}/datasets/{datasetName}/versions`
- **Method**: `GET`
- **Description**: List historical versions of a dataset.

**Endpoint**: `/namespaces/{namespace}/datasets/{datasetName}/tags/{tag}`
- **Method**: `POST`, `DELETE`
- **Description**: Add or remove tags from a dataset.

### 6. Lineage Graph
**Endpoint**: `/lineage`
- **Method**: `GET`
- **Params**: 
  - `nodeId`: The central node to build graph around (format: `job:namespace:name` or `dataset:namespace:name`).
  - `depth`: Depth of traversal (default 20).
- **Description**: Returns a graph of nodes and edges for lineage visualization.
- **Returns**:
  ```json
  {
    "graph": [
      {
        "id": "job:ns:name",
        "type": "JOB",
        "data": { ... },
        "inEdges": [ ... ],
        "outEdges": [ ... ]
      }
    ]
  }
  ```

**Endpoint**: `/column-lineage`
- **Method**: `GET`
- **Description**: Returns a magnified graph including column-level lineage nodes if available.

### 7. Search
**Endpoint**: `/search`
- **Method**: `GET`
- **Params**: 
  - `q`: Search query text.
  - `filter`: `JOB` or `DATASET` (optional).
  - `sort`: `NAME` or `UPDATE_AT`.
- **Description**: Search for jobs and datasets.
- **Returns**:
  ```json
  {
    "totalCount": 10,
    "results": [
      {
        "type": "JOB",
        "name": "my-job",
        "namespace": "ns",
        "nodeId": "job:ns:my-job"
      }
    ]
  }
  ```

### 8. Stats
**Endpoint**: `/stats/lineage-events`
- **Method**: `GET`
- **Description**: Returns time-series stats of event counts (START, COMPLETE, FAIL).

**Endpoint**: `/stats/jobs`
- **Method**: `GET`
- **Description**: Cumulative job growth over time.

**Endpoint**: `/stats/datasets`
- **Method**: `GET`
- **Description**: Cumulative dataset growth over time.

### 9. Sources
**Endpoint**: `/sources`
- **Method**: `GET`
- **Description**: List data sources.

### 10. Tags
**Endpoint**: `/tags`
- **Method**: `GET`, `PUT`
- **Description**: Manage allowed tags.

### 11. Lineage Export
**Endpoint**: `/lineage-export/recent/{days}`
- **Method**: `GET`
- **Params**:
  - `namespaces`: List of namespaces to filter by (optional).
- **Description**: Export lineage data for jobs and datasets active in the last N days.
- **Returns**:
  ```json
  {
      "namespaceData": [
          {
              "namespaceName": "string",
              "jobLineage": [ ... ],
              "columnLineage": [ ... ]
          }
      ]
  }
  ```
