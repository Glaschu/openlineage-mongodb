#!/usr/bin/env python3
import argparse
import requests
from deepdiff import DeepDiff
import sys
from urllib.parse import urljoin

# Set up exclusions to ignore unpredictable / DB-time-specific attributes like UUIDs and timestamps.
EXCLUDE_PATHS = [
    r"root\['createdAt'\]",
    r"root\['updatedAt'\]",
    r"root\['eventTime'\]",
    r".*\['createdAt'\]",
    r".*\['updatedAt'\]",
    r".*\['eventTime'\]",
]

class ApiComparator:
    def __init__(self, marquez_url, docdb_url):
        self.marquez_url = marquez_url.rstrip('/')
        self.docdb_url = docdb_url.rstrip('/')

    def fetch(self, base_url, path):
        full_url = f"{base_url}/{path.lstrip('/')}"
        try:
            resp = requests.get(full_url)
            if not resp.ok:
                return {"_error_status": resp.status_code, "_content": resp.text}
            return resp.json()
        except Exception as e:
            return {"_exception": str(e)}

    def compare_path(self, marquez_path, docdb_path, context=""):
        print(f"Comparing {context} ...")
        marq_obj = self.fetch(self.marquez_url, marquez_path)
        docdb_obj = self.fetch(self.docdb_url, docdb_path)

        diff = DeepDiff(
            marq_obj, 
            docdb_obj, 
            exclude_regex_paths=EXCLUDE_PATHS, 
            ignore_order=True
        )

        if diff:
            print(f"❌ MISMATCH FOUND in {context}:")
            print(diff.pretty())
            return False
        else:
            print(f"✅ PASS: {context}")
            return True

    def run_suite(self, target_namespaces=None):
        tests_passed = 0
        tests_failed = 0

        def tally(result):
            nonlocal tests_passed, tests_failed
            if result:
                tests_passed += 1
            else:
                tests_failed += 1

        print("--- Testing Global Endpoints (from LLD) ---")
        tally(self.compare_path("/api/v1/namespaces", "/api/v2/namespaces", "Namespaces List"))
        tally(self.compare_path("/api/v1/jobs?limit=50", "/api/v2/jobs?limit=50", "Global Jobs List"))
        tally(self.compare_path("/api/v1/search?q=test", "/api/v2/search?q=test", "Global Search"))
        tally(self.compare_path("/api/v1/sources", "/api/v2/sources", "Sources List"))
        tally(self.compare_path("/api/v1/tags", "/api/v2/tags", "Tags List"))
        tally(self.compare_path("/api/v1/events/lineage?limit=50", "/api/v2/events/lineage?limit=50", "Events Lineage Page"))

        if target_namespaces:
            namespaces_to_check = target_namespaces
        else:
            m_namespaces = self.fetch(self.marquez_url, "/api/v1/namespaces")
            if "_error_status" in m_namespaces or "_exception" in m_namespaces:
                print("Failed to fetch namespaces from Marquez. Is it running?")
                return
            namespaces_to_check = [ns.get("name") for ns in m_namespaces.get("namespaces", []) if ns.get("name")]

        for ns_name in namespaces_to_check:
            print(f"\n--- Testing Namespace: {ns_name} ---")
            
            # 1. Namespace Details
            tally(self.compare_path(f"/api/v1/namespaces/{ns_name}", f"/api/v2/namespaces/{ns_name}", f"Namespace Details [{ns_name}]"))

            # 2. Datasets
            tally(self.compare_path(f"/api/v1/namespaces/{ns_name}/datasets?limit=50", f"/api/v2/namespaces/{ns_name}/datasets?limit=50", f"Datasets List [{ns_name}]"))
            
            datasets_resp = self.fetch(self.marquez_url, f"/api/v1/namespaces/{ns_name}/datasets?limit=50")
            datasets = datasets_resp.get("datasets", []) if isinstance(datasets_resp, dict) else []
            for ds in datasets:
                ds_name = ds.get("name")
                if not ds_name: continue
                
                tally(self.compare_path(f"/api/v1/namespaces/{ns_name}/datasets/{ds_name}", f"/api/v2/namespaces/{ns_name}/datasets/{ds_name}", f"Dataset Details [{ns_name}/{ds_name}]"))
                tally(self.compare_path(f"/api/v1/namespaces/{ns_name}/datasets/{ds_name}/versions", f"/api/v2/namespaces/{ns_name}/datasets/{ds_name}/versions", f"Dataset Versions [{ns_name}/{ds_name}]"))
                tally(self.compare_path(f"/api/v1/lineage?nodeId=dataset:{ns_name}:{ds_name}", f"/api/v2/lineage?nodeId=dataset:{ns_name}:{ds_name}", f"Lineage Graph [{ns_name}/{ds_name}]"))
                tally(self.compare_path(f"/api/v1/column-lineage?nodeId=dataset:{ns_name}:{ds_name}", f"/api/v2/column-lineage?nodeId=dataset:{ns_name}:{ds_name}", f"Column Lineage [{ns_name}/{ds_name}]"))

            # 3. Jobs
            tally(self.compare_path(f"/api/v1/namespaces/{ns_name}/jobs?limit=50", f"/api/v2/namespaces/{ns_name}/jobs?limit=50", f"Jobs List [{ns_name}]"))
            
            jobs_resp = self.fetch(self.marquez_url, f"/api/v1/namespaces/{ns_name}/jobs?limit=50")
            jobs = jobs_resp.get("jobs", []) if isinstance(jobs_resp, dict) else []
            for job in jobs:
                job_name = job.get("name")
                if not job_name: continue
                
                tally(self.compare_path(f"/api/v1/namespaces/{ns_name}/jobs/{job_name}", f"/api/v2/namespaces/{ns_name}/jobs/{job_name}", f"Job Details [{ns_name}/{job_name}]"))
                tally(self.compare_path(f"/api/v1/namespaces/{ns_name}/jobs/{job_name}/runs?limit=10", f"/api/v2/namespaces/{ns_name}/jobs/{job_name}/runs?limit=10", f"Job Runs [{ns_name}/{job_name}]"))
                
                runs_resp = self.fetch(self.marquez_url, f"/api/v1/namespaces/{ns_name}/jobs/{job_name}/runs?limit=10")
                runs = runs_resp.get("runs", []) if isinstance(runs_resp, dict) else []
                # Restrict run checking so it doesn't take forever, checking top 3 is enough to gain confidence
                for run in runs[:3]:
                    run_id = run.get("id")
                    if not run_id: continue
                    
                    tally(self.compare_path(f"/api/v1/runs/{run_id}", f"/api/v2/runs/{run_id}", f"Run Detail [{run_id}]"))
                    tally(self.compare_path(f"/api/v1/jobs/runs/{run_id}/facets", f"/api/v2/jobs/runs/{run_id}/facets", f"Job/Run Facets [{run_id}]"))
                    
        print(f"\n--- TEST RUN SUMMARY ---")
        print(f"Total Tests run: {tests_passed + tests_failed}")
        print(f"Passed: {tests_passed}")
        print(f"Failed: {tests_failed}")

        if tests_failed > 0:
            sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Compare Marquez API responses against DocumentDB API responses.")
    parser.add_argument("--marquez", type=str, default="http://localhost:5000", help="Base URL for Postgres Marquez")
    parser.add_argument("--docdb", type=str, default="http://localhost:8080", help="Base URL for DocumentDB API")
    parser.add_argument("--namespaces", type=str, help="Comma-separated list of namespaces to check (e.g. postgres-prod,airflow-ops)")
    
    args = parser.parse_args()
    
    namespaces_list = [ns.strip() for ns in args.namespaces.split(',')] if args.namespaces else None
    
    comparator = ApiComparator(marquez_url=args.marquez, docdb_url=args.docdb)
    comparator.run_suite(target_namespaces=namespaces_list)
