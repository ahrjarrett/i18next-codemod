#!/usr/bin/env pnpm dlx tsx
import * as path from 'node:path'
import { execSync } from 'node:child_process'
import { Command, Prompt } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Effect } from "effect"
import { PKG_NAME, PKG_VERSION } from './version.js'

type Options = {
  paths: string[]
  parser: boolean
  dryrun: boolean
  keySeparator: string
  nsSeparator: string
}

const parserMap = {
  true: 'tsx',
  false: 'ts',
} as const

const booleanChoices = [
  { title: 'true', value: true },
  { title: 'false', value: false },
] as const

const defaults = {
  paths: ['./src'],
  parser: true,
  dryrun: false,
  keySeparator: '.',
  nsSeparator: ':',
} as const satisfies Options

const [, SCRIPT_PATH] = process.argv
const DIST_PATH = path.join(path.dirname(SCRIPT_PATH), '..', PKG_NAME, 'dist')
const TRANSFORM_PATH = path.join(path.resolve(DIST_PATH), 'cjs', 'transform.js')

const paths = Prompt.list({
  message: `Directories to modify (default: '${defaults.paths.join(' ')}')`,
  delimiter: ' ',
})

const parser = Prompt.select({
  message: `Include tsx files? (default: ${defaults.parser})`,
  choices: booleanChoices,
})

const keySeparator = Prompt.text({
  message: `i18next key separator? (default: '${defaults.keySeparator}')`,
})

const nsSeparator = Prompt.text({
  message: `Namespace separator? (default: '${defaults.nsSeparator}')`,
})

const dryrun = Prompt.select({
  message: `Dry run? (default: ${defaults.dryrun})`,
  choices: booleanChoices,
})

const command = Command.prompt(
  'Configure i18next-selector codemod',
  Prompt.all([paths, parser, keySeparator, nsSeparator, dryrun]),
  ([paths, parser, keySeparator, nsSeparator, dryrun]) =>
    run({ paths, parser, keySeparator, nsSeparator, dryrun })
)

function run({ paths, parser, keySeparator, nsSeparator, dryrun }: Options) {
  const CMD = [
    'npx jscodeshift',
    `-t="${TRANSFORM_PATH}"`,
    `--parser=${parserMap[`${parser || defaults.parser}`]}`,
    ...(dryrun ? [`--dry=true`] : []),
    `--keySeparator=${keySeparator || defaults.keySeparator}`,
    `--nsSeparator=${nsSeparator || defaults.nsSeparator}`,
    `${(paths.length === 0 ? defaults.paths : paths).join(' ')}`
  ].join(' ')

  console.log('Executing:\n\r', CMD)

  return Effect.sync(() => execSync(CMD, { stdio: 'inherit' }))
}

const main = Command.run(command, {
  name: PKG_NAME,
  version: `v${PKG_VERSION}` as const,
})

void main(process.argv).pipe(
  Effect.provide(NodeContext.layer),
  NodeRuntime.runMain
)
