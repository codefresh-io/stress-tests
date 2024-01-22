import { parseArgs } from 'https://deno.land/std@0.212.0/cli/parse_args.ts';
import * as colors from 'https://deno.land/std@0.212.0/fmt/colors.ts';

const flags = parseArgs(Deno.args, {
  string: ['pipeline', 'count'],
  default: { count: '1' },
});
const pipeline = flags.pipeline;
const count = +flags.count;

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
console.info(colors.green(`3️⃣  Concurrency:\t${count}`));


const shouldContinue = prompt(colors.yellow('\n⚠️  Do you want to continue? [yes/no]'), 'no');
if (shouldContinue !== 'yes') {
  console.info('👋 Bye!');
  Deno.exit(0);
}

console.info(`🚀 Starting ${count} executions of "${pipeline}"`);
const start = Date.now();
const controller = new AbortController();
Deno.addSignalListener('SIGINT', () => {
  console.info(colors.yellow('\n🛑 Stopping...'));
  controller.abort();
  Deno.exit(0);
});

const executions = new Array(count).fill(0).map(() => {
  return new Deno.Command(`codefresh`, {
    args: [
      'run',
      pipeline,
      '--detach',
    ],
    signal: controller.signal,
  }).output();
});

const results = await Promise.allSettled(executions);
const end = Date.now();
console.info(`Launched ${count} builds of "${pipeline}" in ${end - start}ms`);

for (const result of results) {
  if ((result.status === 'fulfilled' && result.value.code !== 0) || result.status === 'rejected') {
    console.warn(JSON.stringify(result));
  }
}
