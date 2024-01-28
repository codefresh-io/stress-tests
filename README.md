# Run builds concurrently

## Prepare

Install Deno, if needed: https://docs.deno.com/runtime/manual/getting_started/installation

## Run
```
$ deno run --allow-run=codefresh ./run.ts --pipeline testing/stress-worker-single [--count=1] [--runtime]
```
Available flags:

* `--pipeline` — required. Example: `--pipeline project/runtime`
* `--count` — optional, default `1`. Example: `--count 1000`
* `--runtime` — optional, default — pipeline settings. If multiple runtimes are given, workload will be split randomly across all given runtimes. Example: `--runtime foo --runtime bar`

## Terminate
```
$ deno run --allow-run=codefresh ./terminate.ts --pipeline testing/stress-worker-single [--limit=100] [--all]
```
Available flags:

* `--pipeline` — required. Example: `--pipeline project/runtime`
* `--limit` — optional, default `100`. Example: `--limit 10`
* `--all` — optional, default `false`. If set to `true`, will terminate all builds in bunches of "--limit" length.
