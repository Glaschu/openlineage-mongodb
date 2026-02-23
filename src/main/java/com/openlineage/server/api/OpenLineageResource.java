package com.openlineage.server.api;

import com.openlineage.server.api.models.LineageResponse;
import com.openlineage.server.api.models.LineageResponse.Node;
import com.openlineage.server.api.models.LineageResponse.Edge;
import com.openlineage.server.api.models.LineageResponse.JobData;
import com.openlineage.server.api.models.LineageResponse.DatasetData;
import com.openlineage.server.domain.ColumnLineageDatasetFacet;
import com.openlineage.server.storage.document.*;
import com.openlineage.server.storage.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import com.openlineage.server.domain.BfsNode;
import com.openlineage.server.util.LineageNodeParser;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v2")
public class OpenLineageResource {

    private final JobRepository jobRepository;
    private final DatasetRepository datasetRepository;
    private final LineageEventRepository eventRepository;
    private final InputDatasetFacetRepository inputFacetRepository;
    private final OutputDatasetFacetRepository outputFacetRepository;
    private final LineageEdgeRepository lineageEdgeRepository;
    private final org.springframework.data.mongodb.core.MongoTemplate mongoTemplate;
    private final com.openlineage.server.mapper.LineageNodeMapper lineageNodeMapper;

    public OpenLineageResource(JobRepository jobRepository,
            DatasetRepository datasetRepository,
            LineageEventRepository eventRepository,
            InputDatasetFacetRepository inputFacetRepository,
            OutputDatasetFacetRepository outputFacetRepository,
            LineageEdgeRepository lineageEdgeRepository,
            org.springframework.data.mongodb.core.MongoTemplate mongoTemplate,
            com.openlineage.server.mapper.LineageNodeMapper lineageNodeMapper) {
        this.jobRepository = jobRepository;
        this.datasetRepository = datasetRepository;
        this.eventRepository = eventRepository;
        this.inputFacetRepository = inputFacetRepository;
        this.outputFacetRepository = outputFacetRepository;
        this.lineageEdgeRepository = lineageEdgeRepository;
        this.mongoTemplate = mongoTemplate;
        this.lineageNodeMapper = lineageNodeMapper;
    }

    @GetMapping("/lineage")
    public LineageResponse getLineage(
            @RequestParam("nodeId") String nodeId,
            @RequestParam(value = "depth", defaultValue = "20") int depth,
            @RequestParam(value = "aggregateByParent", defaultValue = "false") boolean aggregateByParent) {

        // format: type:namespace:name
        MarquezId centerId = LineageNodeParser.parseNodeId(nodeId);
        String type = LineageNodeParser.parseType(nodeId);

        if ("symlink".equals(type)) {
            org.springframework.data.mongodb.core.query.Query symlinkQuery = new org.springframework.data.mongodb.core.query.Query(
                    org.springframework.data.mongodb.core.query.Criteria.where("facets.symlinks.identifiers").elemMatch(
                            org.springframework.data.mongodb.core.query.Criteria.where("namespace").is(centerId.getNamespace())
                                    .and("name").is(centerId.getName())
                    )
            );

            InputDatasetFacetDocument inputFacet = mongoTemplate.findOne(symlinkQuery, InputDatasetFacetDocument.class);
            if (inputFacet != null) {
                centerId = inputFacet.getDatasetId();
                type = "dataset";
                nodeId = "dataset:" + centerId.getNamespace() + ":" + centerId.getName();
            } else {
                OutputDatasetFacetDocument outputFacet = mongoTemplate.findOne(symlinkQuery, OutputDatasetFacetDocument.class);
                if (outputFacet != null) {
                    centerId = outputFacet.getDatasetId();
                    type = "dataset";
                    nodeId = "dataset:" + centerId.getNamespace() + ":" + centerId.getName();
                } else {
                    throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Symlink not found: " + centerId.getNamespace() + ":" + centerId.getName());
                }
            }
        }

        Set<Node> nodes = new LinkedHashSet<>();
        Set<String> visited = new HashSet<>();
        Map<String, JobDocument> discoveredJobs = new HashMap<>(); // nodeId -> JobDocument

        List<BfsNode> currentLayer = new ArrayList<>();
        currentLayer.add(new BfsNode(type, centerId, 0));
        visited.add(nodeId);

        if ("job".equals(type)) {
            if (aggregateByParent) {
                JobDocument centerJob = jobRepository.findById(centerId).orElse(null);
                if (centerJob != null) {
                    String parentName = centerJob.getParentJobName() != null ? centerJob.getParentJobName() : centerId.getName();
                    
                    org.springframework.data.mongodb.core.query.Query relatedQuery = new org.springframework.data.mongodb.core.query.Query(
                            org.springframework.data.mongodb.core.query.Criteria.where("parentJobName").is(parentName)
                    );
                    List<JobDocument> relatedJobs = mongoTemplate.find(relatedQuery, JobDocument.class);
                    for (JobDocument related : relatedJobs) {
                        String relatedNodeId = "job:" + related.getId().getNamespace() + ":" + related.getId().getName();
                        if (visited.add(relatedNodeId)) {
                            currentLayer.add(new BfsNode("job", related.getId(), 0));
                        }
                    }
                    
                    if (centerJob.getParentJobName() != null) {
                        org.springframework.data.mongodb.core.query.Query parentQuery = new org.springframework.data.mongodb.core.query.Query(
                                org.springframework.data.mongodb.core.query.Criteria.where("_id.name").is(parentName)
                        );
                        List<JobDocument> parents = mongoTemplate.find(parentQuery, JobDocument.class);
                        for (JobDocument p : parents) {
                            String pNodeId = "job:" + p.getId().getNamespace() + ":" + p.getId().getName();
                            if (visited.add(pNodeId)) {
                                currentLayer.add(new BfsNode("job", p.getId(), 0));
                            }
                        }
                    }
                }
            } else {
                org.springframework.data.mongodb.core.query.Query childQuery = new org.springframework.data.mongodb.core.query.Query(
                        org.springframework.data.mongodb.core.query.Criteria.where("parentJobName").is(centerId.getName())
                                .and("_id.namespace").is(centerId.getNamespace())
                );
                List<JobDocument> childJobs = mongoTemplate.find(childQuery, JobDocument.class);
                for (JobDocument child : childJobs) {
                    String childNodeId = "job:" + child.getId().getNamespace() + ":" + child.getId().getName();
                    if (visited.add(childNodeId)) {
                        currentLayer.add(new BfsNode("job", child.getId(), 0));
                    }
                }
            }
        }

        for (int currentDepth = 0; currentDepth < depth; currentDepth++) {
            if (currentLayer.isEmpty()) break;

            List<MarquezId> jobIdsToFetch = new ArrayList<>();
            List<MarquezId> datasetIdsToFetch = new ArrayList<>();

            for (BfsNode node : currentLayer) {
                if ("job".equals(node.type)) jobIdsToFetch.add(node.id);
                else if ("dataset".equals(node.type)) datasetIdsToFetch.add(node.id);
            }

            List<BfsNode> nextLayer = new ArrayList<>();

            // 1. Process Jobs
            if (!jobIdsToFetch.isEmpty()) {
                Iterable<JobDocument> jobs = jobRepository.findAllById(jobIdsToFetch);
                for (JobDocument job : jobs) {
                    processJobBatch(job, nodes, nextLayer, visited, currentDepth, discoveredJobs);
                }
            }

            // 2. Process Datasets
            if (!datasetIdsToFetch.isEmpty()) {
                Iterable<DatasetDocument> datasets = datasetRepository.findAllById(datasetIdsToFetch);

                // Batch-fetch all edges
                List<LineageEdgeDocument> allEdges = new ArrayList<>();
                for (List<MarquezId> batch : partition(datasetIdsToFetch, 100)) {
                    List<org.springframework.data.mongodb.core.query.Criteria> edgeConditions = new ArrayList<>();
                    for (MarquezId dsId : batch) {
                        edgeConditions.add(
                                org.springframework.data.mongodb.core.query.Criteria.where("sourceNamespace").is(dsId.getNamespace()).and("sourceName").is(dsId.getName())
                        );
                        edgeConditions.add(
                                org.springframework.data.mongodb.core.query.Criteria.where("targetNamespace").is(dsId.getNamespace()).and("targetName").is(dsId.getName())
                        );
                    }
                    if (!edgeConditions.isEmpty()) {
                        allEdges.addAll(mongoTemplate.find(
                                new org.springframework.data.mongodb.core.query.Query(
                                        new org.springframework.data.mongodb.core.query.Criteria().orOperator(edgeConditions)
                                ), LineageEdgeDocument.class
                        ));
                    }
                }

                Map<MarquezId, List<LineageEdgeDocument>> datasetToEdges = new HashMap<>();
                for (LineageEdgeDocument edge : allEdges) {
                    MarquezId sourceId = new MarquezId(edge.getSourceNamespace(), edge.getSourceName());
                    MarquezId targetId = new MarquezId(edge.getTargetNamespace(), edge.getTargetName());
                    datasetToEdges.computeIfAbsent(sourceId, k -> new ArrayList<>()).add(edge);
                    datasetToEdges.computeIfAbsent(targetId, k -> new ArrayList<>()).add(edge);
                }

                Iterable<InputDatasetFacetDocument> inputFacets = inputFacetRepository.findAllById(datasetIdsToFetch);
                Map<MarquezId, InputDatasetFacetDocument> inputFacetMap = new HashMap<>();
                inputFacets.forEach(f -> inputFacetMap.put(f.getDatasetId(), f));

                Iterable<OutputDatasetFacetDocument> outputFacets = outputFacetRepository.findAllById(datasetIdsToFetch);
                Map<MarquezId, OutputDatasetFacetDocument> outputFacetMap = new HashMap<>();
                outputFacets.forEach(f -> outputFacetMap.put(f.getDatasetId(), f));

                for (DatasetDocument ds : datasets) {
                    processDatasetBatch(ds, nodes, nextLayer, visited, currentDepth,
                            datasetToEdges.getOrDefault(ds.getId(), Collections.emptyList()),
                            inputFacetMap.get(ds.getId()),
                            outputFacetMap.get(ds.getId()));
                }
            }

            currentLayer = nextLayer;
        }



        // Phase 2: Batch-load latest runs for all discovered jobs
        if (!discoveredJobs.isEmpty()) {
            Map<String, RunDocument> latestRuns = batchLoadLatestRuns(discoveredJobs.values());

            Set<Node> finalNodes = new LinkedHashSet<>();
            for (Node node : nodes) {
                if ("JOB".equals(node.type()) && discoveredJobs.containsKey(node.id())) {
                    JobDocument job = discoveredJobs.get(node.id());
                    String runKey = job.getId().getNamespace() + ":" + job.getId().getName();
                    RunDocument latestRun = latestRuns.get(runKey);
                    JobData data = lineageNodeMapper.mapJob(job, latestRun);
                    finalNodes.add(new Node(node.id(), "JOB", data, node.inEdges(), node.outEdges()));
                } else {
                    finalNodes.add(node);
                }
            }
            return new LineageResponse(finalNodes);
        }

        return new LineageResponse(nodes);
    }

    private <T> List<List<T>> partition(List<T> list, int size) {
        List<List<T>> result = new ArrayList<>();
        for (int i = 0; i < list.size(); i += size) {
            result.add(list.subList(i, Math.min(list.size(), i + size)));
        }
        return result;
    }

    private Map<String, RunDocument> batchLoadLatestRuns(java.util.Collection<JobDocument> jobs) {
        Map<String, RunDocument> result = new java.util.concurrent.ConcurrentHashMap<>();

        // DocumentDB/MongoDB handles parallel independent `.limit(1)` queries extremely fast,
        // avoiding millions of historical run documents being shipped over the wire.
        jobs.parallelStream().forEach(job -> {
            org.springframework.data.mongodb.core.query.Query query = new org.springframework.data.mongodb.core.query.Query(
                    org.springframework.data.mongodb.core.query.Criteria
                            .where("jobNamespace").is(job.getId().getNamespace())
                            .and("jobName").is(job.getId().getName()))
                    .with(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "eventTime"))
                    .limit(1);

            RunDocument latestRun = mongoTemplate.findOne(query, RunDocument.class);
            if (latestRun != null) {
                String key = job.getId().getNamespace() + ":" + job.getId().getName();
                result.put(key, latestRun);
            }
        });

        return result;
    }

    private void processJobBatch(JobDocument job, Set<Node> nodes, List<BfsNode> nextLayer, Set<String> visited,
            int currentDepth, Map<String, JobDocument> discoveredJobs) {
        
        String jobNodeId = "job:" + job.getId().getNamespace() + ":" + job.getId().getName();
        Set<Edge> inEdges = new HashSet<>();
        Set<Edge> outEdges = new HashSet<>();

        if (job.getInputs() != null) {
            for (MarquezId inputId : job.getInputs()) {
                String inputNodeId = "dataset:" + inputId.getNamespace() + ":" + inputId.getName();
                inEdges.add(new Edge(inputNodeId, jobNodeId));
                if (visited.add(inputNodeId)) {
                    nextLayer.add(new BfsNode("dataset", inputId, currentDepth + 1));
                }
            }
        }

        if (job.getOutputs() != null) {
            for (MarquezId outputId : job.getOutputs()) {
                String outputNodeId = "dataset:" + outputId.getNamespace() + ":" + outputId.getName();
                outEdges.add(new Edge(jobNodeId, outputNodeId));
                if (visited.add(outputNodeId)) {
                    nextLayer.add(new BfsNode("dataset", outputId, currentDepth + 1));
                }
            }
        }

        discoveredJobs.put(jobNodeId, job);
        JobData placeholderData = lineageNodeMapper.mapJob(job); 
        nodes.add(new Node(jobNodeId, "JOB", placeholderData, inEdges, outEdges));
    }

    private void processDatasetBatch(DatasetDocument ds, Set<Node> nodes, List<BfsNode> nextLayer, Set<String> visited,
            int currentDepth, List<LineageEdgeDocument> dsEdges, 
            InputDatasetFacetDocument inputFacet, OutputDatasetFacetDocument outputFacet) {
            
        MarquezId datasetId = ds.getId();
        String dsNodeId = "dataset:" + datasetId.getNamespace() + ":" + datasetId.getName();
        Set<Edge> inEdges = new HashSet<>();
        Set<Edge> outEdges = new HashSet<>();

        for (LineageEdgeDocument edge : dsEdges) {
            if ("job".equals(edge.getSourceType()) && edge.getTargetNamespace().equals(datasetId.getNamespace()) && edge.getTargetName().equals(datasetId.getName())) {
                String jobNodeId = "job:" + edge.getSourceNamespace() + ":" + edge.getSourceName();
                inEdges.add(new Edge(jobNodeId, dsNodeId));
                MarquezId jobId = new MarquezId(edge.getSourceNamespace(), edge.getSourceName());
                if (visited.add(jobNodeId)) {
                    nextLayer.add(new BfsNode("job", jobId, currentDepth + 1));
                }
            }
            if ("job".equals(edge.getTargetType()) && edge.getSourceNamespace().equals(datasetId.getNamespace()) && edge.getSourceName().equals(datasetId.getName())) {
                String jobNodeId = "job:" + edge.getTargetNamespace() + ":" + edge.getTargetName();
                outEdges.add(new Edge(dsNodeId, jobNodeId));
                MarquezId jobId = new MarquezId(edge.getTargetNamespace(), edge.getTargetName());
                if (visited.add(jobNodeId)) {
                    nextLayer.add(new BfsNode("job", jobId, currentDepth + 1));
                }
            }
        }

        Map<String, com.openlineage.server.domain.Facet> mergedFacets = new HashMap<>();
        if (inputFacet != null && inputFacet.getFacets() != null) {
            mergedFacets.putAll(inputFacet.getFacets());
        }
        if (outputFacet != null && outputFacet.getFacets() != null) {
            mergedFacets.putAll(outputFacet.getFacets());
        }

        DatasetData data = lineageNodeMapper.mapDataset(ds, mergedFacets);
        nodes.add(new Node(dsNodeId, "DATASET", data, inEdges, outEdges));
    }
    @GetMapping("/column-lineage")
    public LineageResponse getColumnLineage(
            @RequestParam("nodeId") String nodeId,
            @RequestParam(value = "depth", defaultValue = "20") int depth,
            @RequestParam(value = "withDownstream", defaultValue = "false") boolean withDownstream) {

        // 1. Fetch Dataset/Job Graph
        // A column lineage dataset hop is 2 graph edges. We add 1 to ensure the target dataset nodes are fetched.
        int graphDepth = (depth * 2) + 1;
        LineageResponse datasetLineage = getLineage(nodeId, graphDepth, false);

        Map<String, Set<Edge>> inEdgesMap = new HashMap<>();
        Map<String, Set<Edge>> outEdgesMap = new HashMap<>();
        Map<String, com.openlineage.server.api.models.LineageResponse.NodeData> nodeDataMap = new HashMap<>();
        Set<String> fieldNodeIds = new HashSet<>();

        // 2. Create Nodes for Fields
        for (Node node : datasetLineage.graph()) {
            if ("DATASET".equals(node.type())
                    && node.data() instanceof com.openlineage.server.api.models.LineageResponse.DatasetData) {
                com.openlineage.server.api.models.LineageResponse.DatasetData dsData = (com.openlineage.server.api.models.LineageResponse.DatasetData) node
                        .data();

                List<com.openlineage.server.api.models.LineageResponse.DatasetFieldData> fields = lineageNodeMapper
                        .mapSchemaToFields(dsData);
                for (com.openlineage.server.api.models.LineageResponse.DatasetFieldData fieldData : fields) {
                    String fieldNodeId = "datasetField:" + dsData.namespace() + ":" + dsData.name() + ":"
                            + fieldData.field();
                    fieldNodeIds.add(fieldNodeId);
                    nodeDataMap.put(fieldNodeId, fieldData);
                }
            }
        }

        // 3. Create Edges
        for (Node node : datasetLineage.graph()) {
            if ("DATASET".equals(node.type()) && node.data() instanceof DatasetData) {
                DatasetData dsData = (DatasetData) node.data();
                if (dsData.facets() != null && dsData.facets().containsKey("columnLineage")) {
                    com.openlineage.server.domain.Facet facet = dsData.facets().get("columnLineage");
                    if (facet instanceof ColumnLineageDatasetFacet) {
                        ColumnLineageDatasetFacet colLineageFacet = (ColumnLineageDatasetFacet) facet;
                        if (colLineageFacet.fields() != null) {
                            for (Map.Entry<String, ColumnLineageDatasetFacet.Fields> entry : colLineageFacet.fields()
                                    .entrySet()) {
                                String outputCol = entry.getKey();
                                ColumnLineageDatasetFacet.Fields fields = entry.getValue();
                                String outputNodeId = "datasetField:" + dsData.namespace() + ":" + dsData.name() + ":"
                                        + outputCol;

                                for (ColumnLineageDatasetFacet.InputField inputField : fields.inputFields()) {
                                    String inputNodeId = "datasetField:" + inputField.namespace() + ":"
                                            + inputField.name() + ":" + inputField.field();

                                    // Add Edge
                                    Edge edge = new Edge(inputNodeId, outputNodeId);

                                    outEdgesMap.computeIfAbsent(inputNodeId, k -> new HashSet<>()).add(edge);
                                    inEdgesMap.computeIfAbsent(outputNodeId, k -> new HashSet<>()).add(edge);
                                }
                            }
                        }
                    }
                }
            }
        }

        // 4. Assemble
        Set<Node> resultNodes = new LinkedHashSet<>();
        for (String id : fieldNodeIds) {
            resultNodes.add(new Node(
                    id,
                    "column",
                    nodeDataMap.get(id),
                    inEdgesMap.getOrDefault(id, Collections.emptySet()),
                    outEdgesMap.getOrDefault(id, Collections.emptySet())));
        }

        return new LineageResponse(resultNodes);
    }

    public record EventsResponse(List<com.openlineage.server.domain.RunEvent> events, long totalCount) {
    }

    @GetMapping("/events/lineage")
    public EventsResponse getLineageEvents(
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.ZonedDateTime before,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.ZonedDateTime after,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(defaultValue = "0") int offset) {

        if (limit <= 0)
            limit = 10;
        if (limit > 200)
            limit = 200;

        java.time.ZonedDateTime end = before != null ? before : java.time.ZonedDateTime.now().plusYears(100);
        java.time.ZonedDateTime start = after != null ? after : java.time.ZonedDateTime.now().minusYears(100);

        org.springframework.data.domain.Pageable pageRequest = org.springframework.data.domain.PageRequest
                .of(offset / limit, limit, org.springframework.data.domain.Sort.by("eventTime").descending());

        org.springframework.data.domain.Page<LineageEventDocument> page = eventRepository
                .findByEventTimeBetween(start, end, pageRequest);

        List<com.openlineage.server.domain.RunEvent> events = page.getContent().stream()
                .map(LineageEventDocument::getEvent)
                .collect(Collectors.toList());

        return new EventsResponse(events, page.getTotalElements());
    }
}
