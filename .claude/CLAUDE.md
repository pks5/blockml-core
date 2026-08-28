# BlockML Project Instructions

## Purpose

This repository contains a BlockML model.

When working in this repository, treat BML as the editable source of truth. Use the BlockML toolchain to discover, understand, validate, and transform the model.

Do not assume that all relevant BML definitions are located directly in this repository. The effective BlockML model can include BML libraries provided by npm dependencies and workspace packages.

## Minimal BlockML Introduction

BlockML is a declarative modeling language based on BML.

Core principles:

- Everything is a Block.
- BML is the editable source format.
- The BOM is the canonical parsed representation.
- Generated outputs are derived artifacts and are not the source of truth.
- BlockML models can reference definitions from other BlockML libraries.
- BlockML libraries can be installed as npm packages.
- Prefer existing model definitions and conventions over inventing new ones.
- Use the model itself as the authoritative source for detailed BlockML semantics.

Do not rely on this file as complete BlockML documentation. When detailed knowledge about BlockML is required, search the available BML model.

## BlockML CLI

This project is expected to use `@blockml/cli` as a development dependency.

Use the project-local CLI through `npx`:

```bash
npx blockml <command>
```

Do not install or upgrade `@blockml/cli` unless explicitly requested.

If the BlockML CLI is unavailable, first verify that project dependencies have been installed:

```bash
npm ci
```

If `@blockml/cli` is not declared in the project dependencies, report the missing project setup instead of modifying `package.json` automatically.

The initial project setup, performed by the project maintainer, is:

```bash
npm install -D @blockml/cli
```

This only needs to be done when adding the BlockML CLI to a project. Normal agent workflows should use the already declared project dependency.

## Effective Model

The effective model consists of all BML sources discoverable by the BlockML toolchain.

This can include:

- local BML files
- `blocks/`
- workspace packages
- installed BlockML npm packages
- BML libraries under `node_modules`
- other BML sources recognized by the standard BlockML project discovery

The BlockML toolchain is authoritative for determining which BML sources belong to the effective model.

## Search

Use BlockML Search as the preferred way to discover relevant model knowledge.

Before broadly scanning directories or reading many unrelated files, search for the relevant concepts.

```bash
npx blockml search "<query>"
```

Examples:

```bash
npx blockml search "AI workspace"
npx blockml search "renderer capabilities"
npx blockml search "ValueType configuration"
npx blockml search "documentation use cases"
```

Search can return definitions from both the local repository and reachable BlockML dependencies.

Use FQNs from search results to identify the relevant Blocks whenever possible.

### Rebuild Search Index

The search index is a derived artifact and can be rebuilt at any time.

```bash
npx blockml search index
```

If search results appear incomplete or dependencies/model sources have changed, rebuild the index before assuming that a definition does not exist.

## Validation

Use the normal validation command for regular work on the current project:

```bash
npx blockml validate
```

This is the preferred validation command after ordinary BML changes.

Use `--all` when the complete reachable BlockML model must be validated:

```bash
npx blockml validate --all
```

`validate --all` is broader than normal validation. It also includes reachable BlockML libraries from dependencies, including BML sources under `node_modules`.

In other words:

```text
npx blockml validate
    → normal project validation

npx blockml validate --all
    → complete reachable model validation
    → includes BlockML dependencies
    → includes BML sources under node_modules
```

Use `validate --all` deliberately when validating the entire effective model, checking dependency compatibility, or verifying the complete environment. Do not use it as the default validation step for every ordinary edit.

When appropriate, individual files may also be validated:

```bash
npx blockml validate <file>
```

Prefer validation through the BlockML toolchain over manually reasoning about whether BML is syntactically or semantically valid.

Do not silently ignore validation errors caused by your changes.

## Preferred Working Method

For most BlockML tasks, use the following workflow:

1. Understand the requested semantic change or question.
2. Search the model for the relevant concepts using `npx blockml search`.
3. Identify relevant Blocks by FQN.
4. Read the relevant BML definitions.
5. Follow references, base types, related Blocks, or libraries when necessary.
6. Determine the smallest coherent semantic change.
7. Modify the BML source.
8. Run `npx blockml validate`.
9. Fix validation errors caused by the change.
10. Inspect the resulting diff.
11. Use `npx blockml validate --all` when complete effective-model validation is required.
12. Report unresolved problems instead of inventing unsupported solutions.

## Search Before Exploration

Prefer:

```text
question/task
    ↓
npx blockml search
    ↓
relevant FQNs
    ↓
targeted BML reads
    ↓
reason/change
```

over:

```text
question/task
    ↓
scan entire repository
    ↓
read many unrelated files
    ↓
guess relevant definitions
```

Generic repository tools such as file search, grep, or find remain useful, but BlockML Search should normally be the first choice for semantic discovery within the model.

## Model as Knowledge Source

When answering questions about this project or BlockML itself:

- Prefer information explicitly represented in reachable BML.
- Search before assuming a concept is absent.
- Distinguish facts found in the model from assumptions or general knowledge.
- Do not invent BlockML concepts, syntax, types, properties, or capabilities when they can be looked up.
- If the available model does not contain enough information to answer confidently, say so.
- When useful, reference the FQNs of Blocks that support the answer.

The BML model should be treated as a structured knowledge base, not merely as source files.

## Editing Rules

When modifying the model:

1. Modify BML source rather than generated artifacts.
2. Preserve existing naming and structural conventions.
3. Prefer existing Blocks and types over introducing duplicates.
4. Search for similar existing definitions before creating a new concept.
5. Use existing inheritance, aggregation, association, capability, and type patterns where applicable.
6. Keep changes scoped to the requested task.
7. Avoid unrelated cleanup unless required for correctness.
8. Preserve documentation and metadata unless intentionally changing them.
9. Do not rewrite large portions of the model unnecessarily.
10. Validate after modifications using `npx blockml validate`.

## Generated Artifacts

Generated outputs are derived from the BlockML model.

Unless explicitly requested otherwise:

- do not treat generated files as authoritative
- do not fix model problems by manually editing generated output
- make semantic changes in BML
- regenerate manifestations through the appropriate BlockML toolchain command

If it is unclear whether a file is generated, inspect the project conventions before editing it.

## Dependencies and Libraries

Definitions from npm dependencies are part of the reachable knowledge space when discovered by the BlockML toolchain.

Do not assume that a missing local definition needs to be created locally.

First search the complete model:

```bash
npx blockml search "<concept>"
```

A suitable definition may already exist in a BlockML dependency.

Normally, do not modify files under `node_modules`.

If a dependency definition needs to change, report that explicitly or modify the actual workspace/package source when it is part of the current editable workspace.

When validation of dependencies is required, use:

```bash
npx blockml validate --all
```

Remember that `--all` includes reachable BML sources under `node_modules`; normal `npx blockml validate` should be used for routine project validation.

## FQNs

Prefer Fully Qualified Names when referring to Blocks.

FQNs provide stable semantic identities across libraries and should be preferred over ambiguous filenames or short names when communicating about model definitions.

When search returns several similarly named concepts, use their FQNs and surrounding model relationships to determine which definition is relevant.

## Documentation

Documentation inside BML is part of the model and should be treated as searchable semantic content.

When trying to understand:

- purpose
- design rationale
- concepts
- use cases
- architecture
- intended behavior

search documentation as well as structural definitions.

Do not assume documentation is secondary or merely descriptive; in BlockML models it can carry important model knowledge.

## Tooling Principle

Use specialized BlockML tooling when it provides stronger semantics than generic shell tools.

Preferred examples:

```bash
npx blockml search "<query>"
npx blockml validate
```

For complete effective-model validation, including reachable dependencies and BML under `node_modules`:

```bash
npx blockml validate --all
```

Generic tools remain appropriate for repository-level operations such as:

```bash
git status
git diff
```

and for tasks for which no BlockML-specific tool exists.

## Git

Before completing a transformation, inspect the resulting changes.

Useful commands include:

```bash
git status
git diff
```

Do not commit, push, reset, discard, or rewrite user changes unless explicitly instructed to do so.

Do not modify unrelated files merely to produce a clean diff.

## npm

The project may use npm dependencies to provide BlockML libraries and tooling.

Package changes can change the effective BML model.

After dependency changes, ensure that the BlockML search index reflects the current package state. If necessary, explicitly rebuild it:

```bash
npx blockml search index
```

After ordinary model changes, use:

```bash
npx blockml validate
```

After dependency changes, or whenever the complete reachable model should be checked, use:

```bash
npx blockml validate --all
```

This complete validation includes reachable BlockML libraries under `node_modules`.

## When BlockML Syntax Is Unclear

Do not guess.

Use this order:

1. Search for the relevant concept.
2. Inspect existing BML examples.
3. Inspect the corresponding type/definition Blocks.
4. Inspect related framework/core definitions if necessary.
5. Make the change using established patterns.
6. Validate with `npx blockml validate`.

For example:

```bash
npx blockml search "StructType"
npx blockml search "capability"
npx blockml search "aggregation"
```

Existing valid BML is usually a better guide than inventing syntax from memory.

## Knowledge Boundaries

When asked to work strictly from the repository/model:

- use reachable repository and BML content as the knowledge source
- do not fill missing information with assumptions
- clearly state when something cannot be inferred from the available model

When external research is explicitly allowed, distinguish externally obtained information from information represented in the BlockML model.

## General Principle

The purpose of these instructions is not to teach the complete BlockML language.

They define how to work effectively with a BlockML project:

```text
Use the tools to find the knowledge.
Use BML as the source of truth.
Use FQNs to identify concepts.
Make semantic changes in BML.
Use normal validation for normal work.
Use --all for the complete reachable model, including node_modules.
Inspect the diff.
```

When in doubt, search the model rather than guessing.
