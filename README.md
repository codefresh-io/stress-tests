# Run builds concurrently

## Prepare

Install Deno, if needed: https://docs.deno.com/runtime/manual/getting_started/installation

## Run
```
$ deno run --allow-run=codefresh ./run.ts --pipeline testing/stress-worker-single --count 1000
```

## Terminate
```
$ deno run --allow-run=codefresh ./terminate.ts --pipeline testing/stress-worker-single --limit 100
```
