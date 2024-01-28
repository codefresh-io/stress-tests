import { parseArgs } from 'https://deno.land/std@0.212.0/cli/parse_args.ts';
import * as colors from 'https://deno.land/std@0.212.0/fmt/colors.ts';

const flags = parseArgs(Deno.args, {
  string: ['pipeline', 'count', 'runtime'],
  default: { count: '1' },
  collect: ['runtime']
});
const pipeline = flags.pipeline;
const count = +flags.count;
const runtimes = flags.runtime;


if (!pipeline) {
  console.error(colors.brightRed('❌ Missing required flag --pipeline'));
  Deno.exit(1);
}

const currentContext = await new Deno.Command('codefresh', {
  args: ['auth', 'current-context'],
}).output();
if (!currentContext.success) {
  console.error(colors.brightRed('❌ Unable to get current context'));
  console.error(colors.brightRed(new TextDecoder().decode(currentContext.stderr)));
  Deno.exit(1);
}

console.info(colors.green('\n🟢 Setup:'));
console.info(colors.green(`1️⃣  Context:\t${new TextDecoder().decode(currentContext.stdout).split('\n').at(1)}`));
console.info(colors.green(`2️⃣  Pipeline:\t${pipeline}`));
console.info(colors.green(runtimes.length ? `3️⃣  Runtimes:\t${runtimes.join(', ')}` : `3️⃣  Runtime:\t[pipeline settings]`));
console.info(colors.green(`4️⃣  Concurrency:\t${count}`));


const shouldContinue = prompt(colors.yellow('\n⚠️  Do you want to continue? [yes/no]'), 'no');
if (shouldContinue !== 'yes') {
  console.info('👋 Bye!');
  Deno.exit(0);
}

const controller = new AbortController();
Deno.addSignalListener('SIGINT', () => {
  console.info(colors.yellow('\n🛑 Stopping...'));
  controller.abort();
  Deno.exit(0);
});

const getRandomRuntime = (): string | undefined => {
  const index = Math.floor(Math.random() * runtimes.length);
  return runtimes.at(index);
}

const runPipeline = async (pipeline: string, runCount: number): Promise<{ success: number, failure: number }> => {
  console.info(`🚀 [${new Date().toISOString()}] Starting ${runCount} executions of "${pipeline}"`);
  const runtime = getRandomRuntime();
  const executions = new Array(runCount).fill(0).map(() => {
    return new Deno.Command(`codefresh`, {
      args: [
        'run',
        pipeline,
        '--detach',
        ...(runtime ? ['--runtime-name', runtime, '--variable', `RUNTIME=${runtime}`] : [])
      ],
      signal: controller.signal,
    }).output();
  });
  
  const results = await Promise.allSettled(executions);
  let success = 0;
  let failure = 0;
  for (const result of results) {
    if ((result.status === 'fulfilled' && !result.value.success) || result.status === 'rejected') {
      failure += 1;
      console.error(colors.brightRed(`❌ [${new Date().toISOString()}] Failed to start build:`));
      result.status === 'fulfilled'
        ? console.error(colors.brightRed(`stderr:\n${new TextDecoder().decode(result.value.stderr)}`))
        : console.error(colors.brightRed(`reason:\n${result.reason}`));
    } else {
      success += 1;
    }
  }
  console.info(colors.green(`✅ [${new Date().toISOString()}] Successfully started ${success} executions of "${pipeline}"`));
  return { success, failure };
};

const runInBunches = async (pipeline: string, runCount: number, bunchLength = 100): Promise<{ success: number, failure: number }> => {
  let success = 0;
  let failure = 0;
  while (runCount > 0) {
    const results = await runPipeline(pipeline, Math.min(runCount, bunchLength));
    runCount -= Math.min(runCount, bunchLength);
    success += results.success;
    failure += results.failure;
  }
  return { success, failure };
}

let success = 0;
let failure = 0;
const run = async (pipeline: string, runCount?: number, bunchLength?: number): Promise<void> => {
  let count = runCount;
  if (!count) {
    const addCount = +(prompt(colors.yellow('\n➕  Type number to add more builds:'), '0') || '0');
    if (Number.isNaN(addCount) || addCount === 0) return;
    count = addCount;
  }
  const results = await runInBunches(pipeline, count, bunchLength);
  success += results.success;
  failure += results.failure;
  
  failure && console.info(colors.bgRed(`❌ Total, failed to start: ${failure}`));
  console.info(colors.bgGreen(`✅ [${new Date().toISOString()}] Total, successfully started: ${success}`));

  return run(pipeline, undefined, bunchLength);
}

try {
  await run(pipeline, count, 100);
} catch (error) {
  console.error(error);
  Deno.exit(1);
}
