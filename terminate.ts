import { parseArgs } from 'https://deno.land/std@0.212.0/cli/parse_args.ts';
import * as colors from 'https://deno.land/std@0.212.0/fmt/colors.ts';

const flags = parseArgs(Deno.args, {
  string: ['pipeline', 'limit'],
  default: { 'limit': '100' },
});
const pipeline = flags.pipeline;
const limit = flags.limit;

if (!pipeline) {
  console.error(colors.brightRed('❌ Missing required flag --pipeline'));
  Deno.exit(1);
}

const terminateBuilds = async (pipeline: string) => {
  const command = await new Deno.Command('codefresh', {
    args: [
      'get',
      'builds',
      '--pipeline',
      pipeline,
      '--status',
      'running',
      '--status',
      'pending',
      '--limit',
      limit,
      '--output',
      'json',
    ],
  }).output();
  const rawRunning = JSON.parse(new TextDecoder().decode(command.stdout));
  const running = Array.isArray(rawRunning) ? rawRunning : [rawRunning];
  
  if (running.length === 0) {
    console.info(`No running builds, exiting...`);
    return;
  }
  console.info(`Found ${running.length} running builds, terminating...`);
  const results = await Promise.allSettled(running.map((build: any) => {
    return new Deno.Command('codefresh', {
      args: [
        'terminate',
        build.id,
      ],
    }).output();
  }));
results.forEach((result, index) => {
  if ((result.status === 'fulfilled' && result.value.code !== 0) || result.status === 'rejected') {
    console.error(colors.brightRed(`❌ Failed to terminate build ${running[index].id}`));
  } else {
    console.info(colors.green(`✅ Terminated build ${running[index].id}`));
  }
})
  await terminateBuilds(pipeline);
}

await terminateBuilds(pipeline);

console.info(colors.yellow('This script a bit dummy, try running one more time in order to ensure that everything is terminated'))
