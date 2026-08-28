# BlockML Core

This repository contains the **BlockML Core Library** (`org.blockml.bml`) — the framework grammar of [BlockML](https://blockml.org): blocks, type system, capabilities, constraints, documentation, and tooling entry points.

Website: [blockml.org](https://blockml.org)

## What BlockML is

BlockML is a universal declarative language for describing parametric, composable semantic units called **Blocks**. Everything that belongs to a domain's grammar is a Block: domain types, value types, languages, services, constraints, and documentation.

* **BML** (Block Markup Language) is the human- and editor-friendly authoring format — XML files with the extension `.bml`.
* **BOM** (Block Object Model) is its canonical, immutable, lossless representation.
* The compiler is domain-agnostic; all domain-specific knowledge lives in **renderers**, which decide how a model manifests in a particular target.

## Use cases

BlockML is designed around three core use cases, all built on the same principle: information is represented as a structured, semantic model instead of unstructured text or implementation-specific data.

| Use case | Summary |
|----------|---------|
| **Structured project documentation** | A structured alternative to Markdown. Documentation becomes part of the project's model and can be rendered to Markdown, HTML, or other formats — the model stays the source of truth. |
| **General-purpose domain modeling** | Any domain defines its vocabulary as Blocks, types, properties, capabilities, and constraints. Renderers turn the same model into code, configuration, UI, or documentation. |
| **AI workspaces** | The model is the persistent workspace an AI inspects, validates, extends, and transforms — including intermediate states — instead of producing isolated text. |

Full details: [`documentation/CoreUseCases.bml`](blocks/org/blockml/bml/documentation/CoreUseCases.bml).

## Getting started

| File | Role |
|------|------|
| [`blocks/org/blockml/bml/README.bml`](blocks/org/blockml/bml/README.bml) | Reading entry — conceptual documentation in learning order (`relation=ReadFirst`) and task index |
| [`blocks/org/blockml/bml/Library.bml`](blocks/org/blockml/bml/Library.bml) | Library catalog — exported blocks, types, and services (currently version 3.0.0) |

Start with `README.bml`; the library descriptor points there via the `readMe` aggregation.

Install dependencies, then validate the sources with the [BlockML CLI](https://www.npmjs.com/package/@blockml/cli):

```bash
npm install
npx blockml validate
```

The same CLI commands apply to this repository and to any custom BlockML project (see [BlockML CLI](#3-blockml-cli)).

## Creating your own library

A BlockML library is distributed as a regular **npm package**: the BML sources live under `blocks/`, and `package.json` declares the library entry point.

```text
mypackage/
├── blocks/
│   └── com/mydomain/bml/
│       └── Library.bml
├── package.json
└── README.md
```

The directory structure under `blocks/` follows the Block FQN namespace, and `Library.bml` declares which blocks the library exports.

### 1. Set up the package

```bash
npm init
npm install @blockml/core
npm i -D @blockml/cli
```

`@blockml/core` is a regular dependency when your library builds on core definitions. `@blockml/cli` is a development dependency; after installing it, run the tools with `npx blockml …`.

### 2. Declare the library in `package.json`

```json
{
  "blockml": {
    "library": "./blocks/com/mydomain/bml/Library.bml"
  },
  "files": ["blocks", "README.md", "LICENSE"]
}
```

* `blockml.library` gives tooling a deterministic entry point into the installed package, instead of scanning it for a library definition.
* `files` must include `blocks` — otherwise consumers install the package without the BML definitions.

### 3. BlockML CLI

The [BlockML CLI](https://www.npmjs.com/package/@blockml/cli) is the same tooling for every BlockML project that includes it — this repository and any custom library.

```bash
npx blockml validate                 # validate project-owned BML
npx blockml validate --all           # validate all BML, including node_modules
npx blockml compile blockdoc         # generate BlockDoc from the project library
npx blockml compile fatblock         # generate FatBlock from the project library
npx blockml search "search terms"    # search BML files, including node_modules
npx blockml search index             # build the search index
```

Validation does not produce renderer output — rendering is a separate, target-specific operation (`compile`). Run `validate` during development and in CI before publishing.

### 4. Publish

```bash
npx blockml validate
npm publish
```

## License

[Apache-2.0](LICENSE)
