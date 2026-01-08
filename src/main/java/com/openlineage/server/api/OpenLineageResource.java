package com.openlineage.server.api;

import com.openlineage.server.api.models.LineageResponse;
import com.openlineage.server.api.models.LineageResponse.Node;
import com.openlineage.server.api.models.LineageResponse.Edge;
import com.openlineage.server.api.models.LineageResponse.JobData;
import com.openlineage.server.api.models.LineageResponse.DatasetData;
import com.openlineage.server.storage.document.*;
import com.openlineage.server.storage.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1")
public class OpenLineageResource {

    private final JobRepository jobRepository;
    private final DatasetRepository datasetRepository;
    private final LineageEventRepository eventRepository;
    private final InputDatasetFacetRepository inputFacetRepository;
    private final OutputDatasetFacetRepository outputFacetRepository;
    private final com.openlineage.server.mapper.LineageNodeMapper lineageNodeMapper;

    public OpenLineageResource(JobRepository jobRepository,
            DatasetRepository datasetRepository,
            LineageEventRepository eventRepository,
            InputDatasetFacetRepository inputFacetRepository,
            OutputDatasetFacetRepository outputFacetRepository,
            com.openlineage.server.mapper.LineageNodeMapper lineageNodeMapper) {
        this.jobRepository = jobRepository;
        this.datasetRepository = datasetRepository;
        this.eventRepository = eventRepository;
        this.inputFacetRepository = inputFacetRepository;
        this.outputFacetRepository = outputFacetRepository;
        this.lineageNodeMapper = lineageNodeMapper;
    }

    @GetMapping("/lineage")
    public LineageResponse getLineage(
            @RequestParam("nodeId") String nodeId,
            @RequestParam(value = "depth", defaultValue = "20") int depth) {

        Set<Node> nodes = new HashSet<>();
        // format: type:namespace:name
        MarquezId centerId = parseNodeId(nodeId);
        String type = parseType(nodeId);

        Queue<BfsNode> queue = new LinkedList<>();
        Set<String> visited = new HashSet<>();

        // Add center node
        queue.add(new BfsNode(type, centerId, 0));
        visited.add(nodeId);

        while (!queue.isEmpty()) {
            BfsNode current = queue.poll();
            if (current.depth >= depth)
                continue;

            if ("job".equals(current.type)) {
                processJob(current.id, nodes, queue, visited, current.depth);
            } else if ("dataset".equals(current.type)) {
                processDataset(current.id, nodes, queue, visited, current.depth);
            }
        }

        return new LineageResponse(nodes);
    }

    private void processJob(MarquezId jobId, Set<Node> nodes, Queue<BfsNode> queue, Set<String> visited,
            int currentDepth) {
        Optional<JobDocument> jobOpt = jobRepository.findById(jobId);
        if (jobOpt.isEmpty())
            return;
        JobDocument job = jobOpt.get();

        // Add Job Node
        String jobNodeId = "job:" + job.getId().getNamespace() + ":" + job.getId().getName();
        Set<Edge> inEdges = new HashSet<>();
        Set<Edge> outEdges = new HashSet<>();

        // Inputs (Dataset -> Job)
        if (job.getInputs() != null) {
            for (MarquezId inputId : job.getInputs()) {
                String inputNodeId = "dataset:" + inputId.getNamespace() + ":" + inputId.getName();
                inEdges.add(new Edge(inputNodeId, jobNodeId));
                if (visited.add(inputNodeId)) {
                    queue.add(new BfsNode("dataset", inputId, currentDepth + 1));
                }
            }
        }

        // Outputs (Job -> Dataset)
        if (job.getOutputs() != null) {
            for (MarquezId outputId : job.getOutputs()) {
                String outputNodeId = "dataset:" + outputId.getNamespace() + ":" + outputId.getName();
                outEdges.add(new Edge(jobNodeId, outputNodeId));
                if (visited.add(outputNodeId)) {
                    queue.add(new BfsNode("dataset", outputId, currentDepth + 1));
                }
            }
        }

        // Map to JobData
        JobData data = lineageNodeMapper.mapJob(job);

        nodes.add(new Node(jobNodeId, "JOB", data, inEdges, outEdges));
    }

    private void processDataset(MarquezId datasetId, Set<Node> nodes, Queue<BfsNode> queue, Set<String> visited,
            int currentDepth) {
        Optional<DatasetDocument> dsOpt = datasetRepository.findById(datasetId);
        if (dsOpt.isEmpty())
            return;
        DatasetDocument ds = dsOpt.get();

        String dsNodeId = "dataset:" + ds.getId().getNamespace() + ":" + ds.getId().getName();
        Set<Edge> inEdges = new HashSet<>();
        Set<Edge> outEdges = new HashSet<>();

        // Find Jobs consuming this dataset (Dataset -> Job)
        List<JobDocument> consumers = jobRepository.findByInputsContaining(datasetId);
        for (JobDocument job : consumers) {
            String jobNodeId = "job:" + job.getId().getNamespace() + ":" + job.getId().getName();
            outEdges.add(new Edge(dsNodeId, jobNodeId));
            if (visited.add(jobNodeId)) {
                queue.add(new BfsNode("job", job.getId(), currentDepth + 1));
            }
        }

        // Find Jobs producing this dataset (Job -> Dataset)
        List<JobDocument> producers = jobRepository.findByOutputsContaining(datasetId);
        for (JobDocument job : producers) {
            String jobNodeId = "job:" + job.getId().getNamespace() + ":" + job.getId().getName();
            inEdges.add(new Edge(jobNodeId, dsNodeId));
            if (visited.add(jobNodeId)) {
                queue.add(new BfsNode("job", job.getId(), currentDepth + 1));
            }
        }

        // Fetch merged facets
        Map<String, com.openlineage.server.domain.Facet> mergedFacets = new HashMap<>();
        inputFacetRepository.findById(ds.getId()).ifPresent(d -> {
            if (d.getFacets() != null)
                mergedFacets.putAll(d.getFacets());
        });
        outputFacetRepository.findById(ds.getId()).ifPresent(d -> {
            if (d.getFacets() != null)
                mergedFacets.putAll(d.getFacets());
        });

        // Map to DatasetData
        DatasetData data = lineageNodeMapper.mapDataset(ds, mergedFacets);

        nodes.add(new Node(dsNodeId, "DATASET", data, inEdges, outEdges));
    }

    private MarquezId parseNodeId(String nodeId) {
        // format: type:namespace:name
        String[] parts = nodeId.split(":");
        if (parts.length < 3)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid nodeId");
        return new MarquezId(parts[1], parts[2]);
    }

    private String parseType(String nodeId) {
        String[] parts = nodeId.split(":");
        if (parts.length < 3)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid nodeId");
        return parts[0];
    }

    private static class BfsNode {
        String type;
        MarquezId id;
        int depth;

        public BfsNode(String type, MarquezId id, int depth) {
            this.type = type;
            this.id = id;
            this.depth = depth;
        }
    }

    @GetMapping("/column-lineage")
    public LineageResponse getColumnLineage(
            @RequestParam("nodeId") String nodeId,
            @RequestParam(value = "depth", defaultValue = "20") int depth,
            @RequestParam(value = "withDownstream", defaultValue = "false") boolean withDownstream) {

        // 1. Fetch Dataset/Job Graph
        LineageResponse datasetLineage = getLineage(nodeId, depth);

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
        // ... (Logic for column lineage edges can be added here once defined by
        // requirements, currently placeholder as per previous impl)

        // 4. Assemble
        Set<Node> resultNodes = new HashSet<>();
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

        java.time.ZonedDateTime end = before != null ? before : java.time.ZonedDateTime.now().plusYears(100);
        java.time.ZonedDateTime start = after != null ? after : java.time.ZonedDateTime.now().minusYears(100);

        org.springframework.data.domain.Pageable pageRequest = org.springframework.data.domain.PageRequest
                .of(offset / limit, limit, org.springframework.data.domain.Sort.by("event.eventTime").descending());

        org.springframework.data.domain.Page<LineageEventDocument> page = eventRepository
                .findByEventEventTimeBetween(start, end, pageRequest);

        List<com.openlineage.server.domain.RunEvent> events = page.getContent().stream()
                .map(LineageEventDocument::getEvent)
                .collect(Collectors.toList());

        return new EventsResponse(events, page.getTotalElements());
    }
}
