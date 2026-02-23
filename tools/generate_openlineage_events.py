#!/usr/bin/env python3
import json
import uuid
import random
import urllib.request
import argparse
from datetime import datetime, timedelta, timezone

NAMESPACES = {
    "postgres": "postgres-prod",
    "kafka": "kafka-cluster-1",
    "airflow": "airflow-ops",
    "spark": "spark-jobs",
    "glue": "aws-glue-catalog"
}

PRODUCER = "https://github.com/OpenLineage/generate-script/1.0"
SCHEMA_URL = "https://openlineage.io/spec/1-0-5/OpenLineage.json#/$defs/RunEvent"

def generate_schema_fields(num_columns):
    fields = []
    types = ["VARCHAR", "INT", "BOOLEAN", "TIMESTAMP", "FLOAT", "DOUBLE", "JSON"]
    for i in range(1, num_columns + 1):
        fields.append({
            "name": f"col_{i}",
            "type": random.choice(types),
            "description": f"Auto-generated column {i}"
        })
    return fields

def generate_column_lineage(input_datasets, output_ds, num_fields):
    col_lineage = {"fields": {}}
    inputs_flattened = []
    
    for in_ds in input_datasets:
        for i in range(1, 11): # Assume at least 10 columns in input
            inputs_flattened.append({
                "namespace": in_ds["namespace"],
                "name": in_ds["name"],
                "field": f"col_{i}"
            })
            
    for i in range(1, num_fields + 1):
        # randomly pick 1-3 input fields to map to this output field
        num_srcs = random.randint(1, min(3, len(inputs_flattened)))
        input_fields = random.sample(inputs_flattened, num_srcs)
        
        col_lineage["fields"][f"col_{i}"] = {
            "inputFields": input_fields,
            "transformationDescription": "MAPPED",
            "transformationType": "IDENTITY"
        }
    return col_lineage

def generate_dataset(namespace_key, name_prefix, idx, is_output=False, input_datasets=None):
    namespace = NAMESPACES[namespace_key]
    name = f"{name_prefix}_table_{idx}"
    num_columns = random.randint(20, 100)
    
    facets = {
        "schema": {
            "_producer": PRODUCER,
            "_schemaURL": "https://openlineage.io/spec/facets/1-0-0/SchemaDatasetFacet.json#/$defs/SchemaDatasetFacet",
            "fields": generate_schema_fields(num_columns)
        }
    }
    
    if is_output and input_datasets:
        facets["columnLineage"] = {
            "_producer": PRODUCER,
            "_schemaURL": "https://openlineage.io/spec/facets/1-0-1/ColumnLineageDatasetFacet.json",
            **generate_column_lineage(input_datasets, None, num_columns)
        }
        
    return {
        "namespace": namespace,
        "name": name,
        "facets": facets
    }

def generate_run_event(event_type, time, run_id, job, inputs, outputs, parent_run_id=None, parent_job=None):
    run_facets = {}
    if parent_run_id and parent_job:
        run_facets["parent"] = {
            "_producer": PRODUCER,
            "_schemaURL": "https://openlineage.io/spec/facets/1-0-0/ParentRunFacet.json",
            "run": {"runId": parent_run_id},
            "job": {"namespace": parent_job["namespace"], "name": parent_job["name"]}
        }
        
    return {
        "eventType": event_type,
        "eventTime": time.isoformat() + "Z",
        "run": {
            "runId": run_id,
            "facets": run_facets
        },
        "job": {
            "namespace": job["namespace"],
            "name": job["name"],
            "facets": {
                "sourceCodeLocation": {
                    "_producer": PRODUCER,
                    "_schemaURL": "https://openlineage.io/spec/facets/1-0-0/SourceCodeLocationJobFacet.json",
                    "type": "git",
                    "url": f"https://github.com/org/repo/tree/main/jobs/{job['name']}.py"
                }
            }
        },
        "inputs": inputs,
        "outputs": outputs,
        "producer": PRODUCER,
        "schemaURL": SCHEMA_URL
    }

def generate_events(num_parent_jobs=5, children_per_parent=3, datasets_per_job=2):
    events = []
    base_time = datetime.now(timezone.utc) - timedelta(days=1)
    
    # Pre-generate some source datasets
    source_datasets = [generate_dataset("postgres", "raw_crm", i) for i in range(1, 10)]
    
    for p_idx in range(num_parent_jobs):
        parent_job = {"namespace": NAMESPACES["airflow"], "name": f"daily_etl_dag_{p_idx}"}
        parent_run_id = str(uuid.uuid4())
        
        # Parent START
        p_start_time = base_time + timedelta(minutes=p_idx * 10)
        events.append(generate_run_event("START", p_start_time, parent_run_id, parent_job, [], []))
        
        current_inputs = random.sample(source_datasets, 2)
        
        for c_idx in range(children_per_parent):
            child_job = {"namespace": NAMESPACES["spark"], "name": f"transform_task_{p_idx}_{c_idx}"}
            child_run_id = str(uuid.uuid4())
            
            c_start_time = p_start_time + timedelta(minutes=1 + c_idx*5)
            
            # Generate new outputs for this child
            outputs = [generate_dataset("glue", f"processed_{p_idx}_{c_idx}", i, True, current_inputs) for i in range(datasets_per_job)]
            
            # Child START
            events.append(generate_run_event("START", c_start_time, child_run_id, child_job, current_inputs, [], parent_run_id, parent_job))
            
            # Child COMPLETE
            c_end_time = c_start_time + timedelta(minutes=4)
            events.append(generate_run_event("COMPLETE", c_end_time, child_run_id, child_job, current_inputs, outputs, parent_run_id, parent_job))
            
            # Chain the outputs to be inputs for the next child task
            current_inputs = outputs

        # Parent COMPLETE
        p_end_time = p_start_time + timedelta(minutes=children_per_parent * 5 + 5)
        events.append(generate_run_event("COMPLETE", p_end_time, parent_run_id, parent_job, [], []))
        
    return events

def post_events(events, target_url):
    print(f"Posting {len(events)} events to {target_url}...")
    headers = {'Content-Type': 'application/json'}
    
    req = urllib.request.Request(target_url, data=json.dumps(events).encode('utf-8'), headers=headers, method='POST')
    try:
        urllib.request.urlopen(req)
        print("Successfully posted bulk events.")
    except Exception as e:
        print(f"Error posting events: {e}")
        # Try falling back to individual POSTs if bulk isn't supported
        print("Trying individual event posts to /api/v1/lineage ...")
        fallback_url = target_url.replace('/events', '')
        success_count = 0
        for ev in events:
            ev_req = urllib.request.Request(fallback_url, data=json.dumps(ev).encode('utf-8'), headers=headers, method='POST')
            try:
                urllib.request.urlopen(ev_req)
                success_count += 1
            except Exception as ev_e:
                print(f"Error posting individual event: {ev_e}")
                break
        print(f"Successfully posted {success_count}/{len(events)} events.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate synthetic OpenLineage events")
    parser.add_argument("--parents", type=int, default=10, help="Number of parent jobs (DAGs)")
    parser.add_argument("--children", type=int, default=5, help="Number of child tasks per parent")
    parser.add_argument("--post", type=str, help="URL to POST events directly (e.g. http://localhost:8080/api/v1/events/lineage)")
    parser.add_argument("--output", type=str, default="generated_events.json", help="Output JSON file path")
    
    args = parser.parse_args()
    
    print(f"Generating OpenLineage events: {args.parents} parents, {args.children} children per parent...")
    events = generate_events(num_parent_jobs=args.parents, children_per_parent=args.children)
    print(f"Generated {len(events)} total events.")
    
    with open(args.output, "w") as f:
        json.dump(events, f, indent=2)
    print(f"Saved generated events to {args.output}")
    
    if args.post:
        post_events(events, args.post)
