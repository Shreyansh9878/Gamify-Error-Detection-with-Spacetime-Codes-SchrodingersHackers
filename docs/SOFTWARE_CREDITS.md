# Software and method credits

Inventory was generated from `package.json`, the exact `packages` keys in `pnpm-lock.yaml`, `requirements.lock.txt`, `requirements-deploy.txt`, and `requirements-draw.txt`, using installed distribution metadata and exact-version npm registry metadata for noninstalled platform packages. All **201 npm lock entries** and **44 Python distributions** (runtime/test/drawing closure for this installed environment) are listed below. Optional platform builds are included for completeness; they are not all installed on Vercel. Direct JS ranges resolve to the listed lock versions. Drawing requirements are ranges, **not fully pinned**; listed drawing versions are observed local versions, not a claim of a cross-platform frozen drawing lock.

License identifiers are package-declared metadata or installed license-file summaries. Preserve upstream license/NOTICE files; this table does not replace redistribution obligations or enumerate every vendored native subcomponent. NumPy/SciPy wheels include additional library notices; Sharp/libvips packages include LGPL terms; Matplotlib fonts have their own notices. Those notices remain in the installed distributions. The repository currently has **no project-level LICENSE file** (`git ls-files '*LICENSE*'`); the team must choose one if it wants to license its own code. Public visibility is not itself a license grant.

Metadata reproduction tools (development only, no new runtime dependency):

```powershell
.venv/Scripts/python.exe -m pip list --format=json
.venv/Scripts/python.exe -m pip show qiskit qiskit-aer qiskit-paulice matplotlib pylatexenc
pnpm list --depth Infinity --json
# Exact platform packages/version pins are in pnpm-lock.yaml, including those not installed here.
# Python license: importlib.metadata.metadata(name)['License-Expression'] or ['License'],
# with Classifier/installed LICENSE fallback. npm: package.json license or exact-version registry metadata.
```

### D1. Python distributions

| Distribution | Observed version | License / notices | Purpose |
|---|---|---|---|
| annotated-doc | 0.0.5 | MIT | Document parameters, class attributes, return types, and variables inline, with Annotated. |
| annotated-types | 0.8.0 | MIT | Reusable constraint types to use with typing.Annotated |
| anyio | 4.15.1 | MIT | High-level concurrency and networking framework on top of asyncio or Trio |
| certifi | 2026.7.22 | MPL-2.0 | Python package for providing Mozilla's CA Bundle. |
| click | 8.5.0 | BSD-3-Clause | Composable command line interface toolkit |
| colorama | 0.4.6 | BSD-3-Clause | Cross-platform colored terminal text. |
| contourpy | 1.3.2 | BSD-3-Clause | Python library for calculating contours of 2D quadrilateral grids |
| cycler | 0.12.1 | BSD-3-Clause | Composable style cycles |
| dill | 0.4.1 | BSD-3-Clause | serialize all of Python |
| exceptiongroup | 1.3.1 | MIT | Backport of PEP 654 (exception groups) |
| fastapi | 0.143.1 | MIT | HTTP API endpoint framework |
| fonttools | 4.65.0 | MIT | Tools to manipulate font files |
| h11 | 0.16.0 | MIT | A pure-Python, bring-your-own-I/O implementation of HTTP/1.1 |
| httpcore | 1.0.9 | BSD-3-Clause | A minimal low-level HTTP client. |
| httpx | 0.28.1 | BSD-3-Clause | The next generation HTTP client. |
| idna | 3.20 | BSD-3-Clause | Internationalized Domain Names in Applications (IDNA) |
| iniconfig | 2.3.1 | MIT | INI configuration parsing for test tooling |
| kiwisolver | 1.5.1 | BSD-3-Clause | A fast implementation of the Cassowary constraint solver |
| matplotlib | 3.10.9 | Matplotlib license (PSF-based); bundled font notices | Offline circuit figures and experiment notebook plots |
| numpy | 2.2.6 | BSD-3-Clause; bundled notices | Matrix/state/channel numerical arrays |
| opentelemetry-api | 1.45.1 | Apache-2.0 | OpenTelemetry Python API |
| packaging | 26.3 | Apache-2.0 OR BSD-2-Clause | Core utilities for Python packages |
| pillow | 12.3.0 | MIT-CMU | Python Imaging Library (fork) |
| pluggy | 1.6.0 | MIT | plugin and hook calling mechanisms for python |
| psutil | 7.2.2 | BSD-3-Clause | Local feasibility process memory/CPU measurement |
| pydantic | 2.14.1 | MIT | Data validation using Python type hints |
| pydantic-core | 2.50.1 | MIT | Core functionality for Pydantic validation and serialization |
| pygments | 2.21.0 | BSD-2-Clause | Pygments is a syntax highlighting package written in Python. |
| pylatexenc | 2.11 | MIT | Math label rendering for offline Qiskit circuit drawing |
| pyparsing | 3.3.3 | MIT | pyparsing - Classes and methods to define and execute parsing grammars |
| pytest | 9.1.1 | MIT | pytest: simple powerful testing with Python |
| python-dateutil | 2.9.0.post0 | Apache-2.0 / BSD-3-Clause (see LICENSE) | Extensions to the standard Python datetime module |
| qiskit | 2.5.2 | Apache-2.0 | Circuits, Pauli/Clifford transport, statevector/stabilizer reference and drawing |
| qiskit-aer | 0.17.2 | Apache-2.0 | Exact noisy density evolution and diagnostic sampling |
| qiskit-paulice | 0.2.1 | Apache-2.0 | Guarded Clifford-only native check insertion and gamma/windowed search |
| rustworkx | 0.18.1 | Apache-2.0 | A High-Performance Graph Library for Python |
| scipy | 1.15.3 | BSD-3-Clause; bundled notices | Scientific linear algebra and quantum-library dependency |
| six | 1.17.0 | MIT | Python 2 and 3 compatibility utilities |
| starlette | 1.7.0 | BSD-3-Clause | The little ASGI library that shines. |
| stevedore | 5.8.0 | Apache-2.0 | Manage dynamic plugins for Python applications |
| tomli | 2.5.0 | MIT | A lil' TOML parser |
| typing-extensions | 4.16.0 | PSF-2.0 | Backported and Experimental Type Hints for Python 3.9+ |
| typing-inspection | 0.4.4 | MIT | Runtime typing introspection tools |
| uvicorn | 0.54.0 | BSD-3-Clause | Local ASGI server |

### D1a. Additional notebook-only Python packages

These 41 additional distributions complete the 85-package analysis environment alongside D1. Versions are pinned in `notebooks/requirements.txt`; licenses/purposes below come from the independently installed distribution metadata. A family label where metadata omits an SPDX variant is intentionally not a guess at that variant. Keep bundled notices. No notebook package was added to deployed requirements.

| Distribution | Pinned version | Declared license / notice | Purpose |
|---|---|---|---|
| asttokens | 3.0.2 | Apache-2.0 | Annotate AST trees with source code positions |
| attrs | 26.1.0 | MIT | Classes Without Boilerplate |
| beautifulsoup4 | 4.15.0 | MIT | Screen-scraping library |
| bleach | 6.4.0 | Apache-2.0 | An easy safelist-based HTML-sanitizing tool. |
| comm | 0.2.3 | BSD-3-Clause (distribution notice) | Jupyter Python Comm implementation, for usage in ipykernel, xeus-python etc. |
| debugpy | 1.8.22 | MIT | An implementation of the Debug Adapter Protocol for Python |
| decorator | 5.3.1 | BSD-2-Clause | Decorators for Humans |
| defusedxml | 0.7.1 | PSF license (distribution metadata) | XML bomb protection for Python stdlib modules |
| executing | 2.3.0 | MIT | Get the currently executing AST node of a frame, and other information |
| fastjsonschema | 2.22.2 | BSD-3-Clause | Fastest Python implementation of JSON schema |
| ipykernel | 6.30.1 | BSD-3-Clause (distribution notice) | IPython Kernel for Jupyter |
| ipython | 8.39.0 | BSD-3-Clause | IPython: Productive Interactive Computing |
| jedi | 0.20.1 | MIT | An autocompletion tool for Python that can be used for text editors. |
| Jinja2 | 3.1.6 | BSD License | A very fast and expressive template engine. |
| jsonschema | 4.26.0 | MIT | An implementation of JSON Schema validation for Python |
| jsonschema-specifications | 2025.9.1 | MIT | The JSON Schema meta-schemas and vocabularies, exposed as a Registry |
| jupyter_client | 8.10.0 | BSD-3-Clause (distribution notice) | Jupyter protocol implementation and client libraries |
| jupyter_core | 5.9.1 | BSD-3-Clause | Jupyter core package. A base package on which Jupyter projects rely. |
| jupyterlab_pygments | 0.3.0 | BSD-3-Clause (distribution notice) | Pygments theme using JupyterLab CSS variables |
| MarkupSafe | 3.0.4 | BSD-3-Clause | Safely add untrusted strings to HTML/XML markup. |
| matplotlib-inline | 0.2.2 | BSD-3-Clause | Inline Matplotlib backend for Jupyter |
| mistune | 3.3.4 | BSD-3-Clause | A sane and fast Markdown parser with useful plugins and renderers |
| nbclient | 0.10.2 | BSD-3-Clause (distribution notice) | A client library for executing notebooks. Formerly nbconvert's ExecutePreprocessor. |
| nbconvert | 7.16.6 | BSD-3-Clause (distribution notice) | Converting Jupyter Notebooks (.ipynb files) to other formats. Output formats include asciidoc, html, latex, markdown, pdf, py, rst, script. nbconvert can be used both as a Python library (`import nbconvert`) or as a command line tool (invoked as `jupyter nbconvert ...`). |
| nbformat | 5.10.4 | BSD-3-Clause (distribution notice) | The Jupyter Notebook format |
| nest-asyncio | 1.6.0 | BSD | Patch asyncio to allow nested event loops |
| pandocfilters | 1.5.1 | BSD-3-Clause | Utilities for writing pandoc filters in python |
| parso | 0.8.7 | MIT | A Python Parser |
| platformdirs | 4.12.4 | MIT | A small Python package for determining appropriate platform-specific dirs, e.g. a `user data dir`. |
| prompt_toolkit | 3.0.53 | BSD License | Library for building powerful interactive command lines in Python |
| pure_eval | 0.2.4 | MIT | Safely evaluate AST nodes without side effects |
| pyzmq | 27.2.0 | BSD-3-Clause | Python bindings for 0MQ |
| referencing | 0.37.0 | MIT | JSON Referencing + Python |
| rpds-py | 0.30.0 | MIT | Python bindings to Rust's persistent data structures (rpds) |
| soupsieve | 2.10 | MIT | A modern CSS selector implementation for Beautiful Soup. |
| stack-data | 0.6.3 | MIT | Extract data from python stack frames and tracebacks for informative displays |
| tinycss2 | 1.5.1 | BSD License | A tiny CSS parser |
| tornado | 6.5.10 | Apache-2.0 | Tornado is a Python web framework and asynchronous networking library, originally developed at FriendFeed. |
| traitlets | 5.16.1 | BSD-3-Clause (distribution notice) | Traitlets Python configuration system |
| wcwidth | 0.9.2 | MIT | Measures the displayed width of unicode strings in a terminal |
| webencodings | 0.6.1 | BSD License | Character encoding aliases for legacy web content |

### D2. JavaScript packages, including transitive/platform dependencies

| Package | Locked version | Declared license | Purpose / scope |
|---|---|---|---|
| @alloc/quick-lru | 5.3.0 | MIT | Simple “Least Recently Used” (LRU) cache; transitive / platform-dependent |
| @emnapi/runtime | 1.11.3 | MIT | emnapi runtime; transitive / platform-dependent |
| @esbuild/aix-ppc64 | 0.28.2 | MIT | The IBM AIX PowerPC 64-bit binary for esbuild, a JavaScript bundler.; transitive / platform-dependent |
| @esbuild/android-arm64 | 0.28.2 | MIT | The Android ARM 64-bit binary for esbuild, a JavaScript bundler.; transitive / platform-dependent |
| @esbuild/android-arm | 0.28.2 | MIT | A WebAssembly shim for esbuild on Android ARM.; transitive / platform-dependent |
| @esbuild/android-x64 | 0.28.2 | MIT | A WebAssembly shim for esbuild on Android x64.; transitive / platform-dependent |
| @esbuild/darwin-arm64 | 0.28.2 | MIT | The macOS ARM 64-bit binary for esbuild, a JavaScript bundler.; transitive / platform-dependent |
| @esbuild/darwin-x64 | 0.28.2 | MIT | The macOS 64-bit binary for esbuild, a JavaScript bundler.; transitive / platform-dependent |
| @esbuild/freebsd-arm64 | 0.28.2 | MIT | The FreeBSD ARM 64-bit binary for esbuild, a JavaScript bundler.; transitive / platform-dependent |
| @esbuild/freebsd-x64 | 0.28.2 | MIT | The FreeBSD 64-bit binary for esbuild, a JavaScript bundler.; transitive / platform-dependent |
| @esbuild/linux-arm64 | 0.28.2 | MIT | The Linux ARM 64-bit binary for esbuild, a JavaScript bundler.; transitive / platform-dependent |
| @esbuild/linux-arm | 0.28.2 | MIT | The Linux ARM binary for esbuild, a JavaScript bundler.; transitive / platform-dependent |
| @esbuild/linux-ia32 | 0.28.2 | MIT | The Linux 32-bit binary for esbuild, a JavaScript bundler.; transitive / platform-dependent |
| @esbuild/linux-loong64 | 0.28.2 | MIT | The Linux LoongArch 64-bit binary for esbuild, a JavaScript bundler.; transitive / platform-dependent |
| @esbuild/linux-mips64el | 0.28.2 | MIT | The Linux MIPS 64-bit Little Endian binary for esbuild, a JavaScript bundler.; transitive / platform-dependent |
| @esbuild/linux-ppc64 | 0.28.2 | MIT | The Linux PowerPC 64-bit Little Endian binary for esbuild, a JavaScript bundler.; transitive / platform-dependent |
| @esbuild/linux-riscv64 | 0.28.2 | MIT | The Linux RISC-V 64-bit binary for esbuild, a JavaScript bundler.; transitive / platform-dependent |
| @esbuild/linux-s390x | 0.28.2 | MIT | The Linux IBM Z 64-bit Big Endian binary for esbuild, a JavaScript bundler.; transitive / platform-dependent |
| @esbuild/linux-x64 | 0.28.2 | MIT | The Linux 64-bit binary for esbuild, a JavaScript bundler.; transitive / platform-dependent |
| @esbuild/netbsd-arm64 | 0.28.2 | MIT | The NetBSD ARM 64-bit binary for esbuild, a JavaScript bundler.; transitive / platform-dependent |
| @esbuild/netbsd-x64 | 0.28.2 | MIT | The NetBSD AMD64 binary for esbuild, a JavaScript bundler.; transitive / platform-dependent |
| @esbuild/openbsd-arm64 | 0.28.2 | MIT | The OpenBSD ARM 64-bit binary for esbuild, a JavaScript bundler.; transitive / platform-dependent |
| @esbuild/openbsd-x64 | 0.28.2 | MIT | The OpenBSD 64-bit binary for esbuild, a JavaScript bundler.; transitive / platform-dependent |
| @esbuild/openharmony-arm64 | 0.28.2 | MIT | A WebAssembly shim for esbuild on OpenHarmony ARM64.; transitive / platform-dependent |
| @esbuild/sunos-x64 | 0.28.2 | MIT | The illumos 64-bit binary for esbuild, a JavaScript bundler.; transitive / platform-dependent |
| @esbuild/win32-arm64 | 0.28.2 | MIT | The Windows ARM 64-bit binary for esbuild, a JavaScript bundler.; transitive / platform-dependent |
| @esbuild/win32-ia32 | 0.28.2 | MIT | The Windows 32-bit binary for esbuild, a JavaScript bundler.; transitive / platform-dependent |
| @esbuild/win32-x64 | 0.28.2 | MIT | The Windows 64-bit binary for esbuild, a JavaScript bundler.; transitive / platform-dependent |
| @img/colour | 1.1.0 | MIT | The ESM-only 'color' package made compatible for use with CommonJS runtimes; transitive / platform-dependent |
| @img/sharp-darwin-arm64 | 0.35.5 | Apache-2.0 | Prebuilt sharp for use with macOS 64-bit ARM; transitive / platform-dependent |
| @img/sharp-darwin-x64 | 0.35.5 | Apache-2.0 | Prebuilt sharp for use with macOS x64; transitive / platform-dependent |
| @img/sharp-freebsd-wasm32 | 0.35.5 | Apache-2.0 | Prebuilt sharp for use with FreeBSD (WebAssembly); transitive / platform-dependent |
| @img/sharp-libvips-darwin-arm64 | 1.3.4 | LGPL-3.0-or-later | Prebuilt libvips and dependencies for use with sharp on macOS 64-bit ARM; transitive / platform-dependent |
| @img/sharp-libvips-darwin-x64 | 1.3.4 | LGPL-3.0-or-later | Prebuilt libvips and dependencies for use with sharp on macOS x64; transitive / platform-dependent |
| @img/sharp-libvips-linux-arm64 | 1.3.4 | LGPL-3.0-or-later | Prebuilt libvips and dependencies for use with sharp on Linux (glibc) 64-bit ARM; transitive / platform-dependent |
| @img/sharp-libvips-linux-arm | 1.3.4 | LGPL-3.0-or-later | Prebuilt libvips and dependencies for use with sharp on Linux (glibc) 32-bit ARM; transitive / platform-dependent |
| @img/sharp-libvips-linux-ppc64 | 1.3.4 | LGPL-3.0-or-later | Prebuilt libvips and dependencies for use with sharp on Linux (glibc) ppc64le; transitive / platform-dependent |
| @img/sharp-libvips-linux-riscv64 | 1.3.4 | LGPL-3.0-or-later | Prebuilt libvips and dependencies for use with sharp on Linux (glibc) RISC-V 64-bit; transitive / platform-dependent |
| @img/sharp-libvips-linux-s390x | 1.3.4 | LGPL-3.0-or-later | Prebuilt libvips and dependencies for use with sharp on Linux (glibc) s390x; transitive / platform-dependent |
| @img/sharp-libvips-linux-x64 | 1.3.4 | LGPL-3.0-or-later | Prebuilt libvips and dependencies for use with sharp on Linux (glibc) x64; transitive / platform-dependent |
| @img/sharp-libvips-linuxmusl-arm64 | 1.3.4 | LGPL-3.0-or-later | Prebuilt libvips and dependencies for use with sharp on Linux (musl) 64-bit ARM; transitive / platform-dependent |
| @img/sharp-libvips-linuxmusl-x64 | 1.3.4 | LGPL-3.0-or-later | Prebuilt libvips and dependencies for use with sharp on Linux (musl) x64; transitive / platform-dependent |
| @img/sharp-linux-arm64 | 0.35.5 | Apache-2.0 | Prebuilt sharp for use with Linux (glibc) 64-bit ARM; transitive / platform-dependent |
| @img/sharp-linux-arm | 0.35.5 | Apache-2.0 | Prebuilt sharp for use with Linux (glibc) ARM (32-bit); transitive / platform-dependent |
| @img/sharp-linux-ppc64 | 0.35.5 | Apache-2.0 | Prebuilt sharp for use with Linux (glibc) ppc64; transitive / platform-dependent |
| @img/sharp-linux-riscv64 | 0.35.5 | Apache-2.0 | Prebuilt sharp for use with Linux (glibc) RISC-V 64-bit; transitive / platform-dependent |
| @img/sharp-linux-s390x | 0.35.5 | Apache-2.0 | Prebuilt sharp for use with Linux (glibc) s390x; transitive / platform-dependent |
| @img/sharp-linux-x64 | 0.35.5 | Apache-2.0 | Prebuilt sharp for use with Linux (glibc) x64; transitive / platform-dependent |
| @img/sharp-linuxmusl-arm64 | 0.35.5 | Apache-2.0 | Prebuilt sharp for use with Linux (musl) 64-bit ARM; transitive / platform-dependent |
| @img/sharp-linuxmusl-x64 | 0.35.5 | Apache-2.0 | Prebuilt sharp for use with Linux (musl) x64; transitive / platform-dependent |
| @img/sharp-wasm32 | 0.35.5 | Apache-2.0 AND LGPL-3.0-or-later AND MIT | Prebuilt sharp for use with WebAssembly; transitive / platform-dependent |
| @img/sharp-webcontainers-wasm32 | 0.35.5 | Apache-2.0 | Prebuilt sharp for use with WebContainers (WebAssembly); transitive / platform-dependent |
| @img/sharp-win32-arm64 | 0.35.5 | Apache-2.0 AND LGPL-3.0-or-later | Prebuilt sharp for use with Windows 64-bit ARM; transitive / platform-dependent |
| @img/sharp-win32-ia32 | 0.35.5 | Apache-2.0 AND LGPL-3.0-or-later | Prebuilt sharp for use with Windows x86 (deprecated); transitive / platform-dependent |
| @img/sharp-win32-x64 | 0.35.5 | Apache-2.0 AND LGPL-3.0-or-later | Prebuilt sharp for use with Windows x64; transitive / platform-dependent |
| @jridgewell/gen-mapping | 0.3.13 | MIT | Generate source maps; transitive / platform-dependent |
| @jridgewell/remapping | 2.3.5 | MIT | Remap sequential sourcemaps through transformations to point at the original source code; transitive / platform-dependent |
| @jridgewell/resolve-uri | 3.1.2 | MIT | Resolve a URI relative to an optional base URI; transitive / platform-dependent |
| @jridgewell/sourcemap-codec | 1.6.0 | MIT | Encode/decode sourcemap mappings; transitive / platform-dependent |
| @jridgewell/trace-mapping | 0.3.31 | MIT | Trace the original position through a source map; transitive / platform-dependent |
| @napi-rs/lzma-linux-x64-gnu | 1.5.1 | MIT | lzma / lzma2 / xz compression for Node.js and the browser, backed by pure-Rust lzma-rust2 via https://napi.rs; transitive / platform-dependent |
| @next/env | 16.4.0 | MIT | Next.js dotenv file loading; transitive / platform-dependent |
| @next/swc-darwin-arm64 | 16.4.0 | MIT | This is the **aarch64-apple-darwin** binary for @next/swc; transitive / platform-dependent |
| @next/swc-darwin-x64 | 16.4.0 | MIT | This is the **x86_64-apple-darwin** binary for @next/swc; transitive / platform-dependent |
| @next/swc-linux-arm64-gnu | 16.4.0 | MIT | This is the **linux-arm64-gnu** binary for @next/swc; transitive / platform-dependent |
| @next/swc-linux-arm64-musl | 16.4.0 | MIT | This is the **linux-arm64-musl** binary for @next/swc; transitive / platform-dependent |
| @next/swc-linux-x64-gnu | 16.4.0 | MIT | This is the **x86_64-unknown-linux-gnu** binary for @next/swc; transitive / platform-dependent |
| @next/swc-linux-x64-musl | 16.4.0 | MIT | This is the **linux-x64-musl** binary for @next/swc; transitive / platform-dependent |
| @next/swc-win32-arm64-msvc | 16.4.0 | MIT | This is the **win32-arm64-msvc** binary for @next/swc; transitive / platform-dependent |
| @next/swc-win32-x64-msvc | 16.4.0 | MIT | Platform-specific native SWC compiler for Next.js; transitive / platform-dependent |
| @playwright/test | 1.64.0 | Apache-2.0 | Desktop/mobile browser test runner; direct development |
| @rollup/rollup-android-arm-eabi | 4.64.6 | MIT | Native bindings for Rollup; transitive / platform-dependent |
| @rollup/rollup-android-arm64 | 4.64.6 | MIT | Native bindings for Rollup; transitive / platform-dependent |
| @rollup/rollup-darwin-arm64 | 4.64.6 | MIT | Native bindings for Rollup; transitive / platform-dependent |
| @rollup/rollup-darwin-x64 | 4.64.6 | MIT | Native bindings for Rollup; transitive / platform-dependent |
| @rollup/rollup-freebsd-arm64 | 4.64.6 | MIT | Native bindings for Rollup; transitive / platform-dependent |
| @rollup/rollup-freebsd-x64 | 4.64.6 | MIT | Native bindings for Rollup; transitive / platform-dependent |
| @rollup/rollup-linux-arm-gnueabihf | 4.64.6 | MIT | Native bindings for Rollup; transitive / platform-dependent |
| @rollup/rollup-linux-arm-musleabihf | 4.64.6 | MIT | Native bindings for Rollup; transitive / platform-dependent |
| @rollup/rollup-linux-arm64-gnu | 4.64.6 | MIT | Native bindings for Rollup; transitive / platform-dependent |
| @rollup/rollup-linux-arm64-musl | 4.64.6 | MIT | Native bindings for Rollup; transitive / platform-dependent |
| @rollup/rollup-linux-loong64-gnu | 4.64.6 | MIT | Native bindings for Rollup; transitive / platform-dependent |
| @rollup/rollup-linux-loong64-musl | 4.64.6 | MIT | Native bindings for Rollup; transitive / platform-dependent |
| @rollup/rollup-linux-ppc64-gnu | 4.64.6 | MIT | Native bindings for Rollup; transitive / platform-dependent |
| @rollup/rollup-linux-ppc64-musl | 4.64.6 | MIT | Native bindings for Rollup; transitive / platform-dependent |
| @rollup/rollup-linux-riscv64-gnu | 4.64.6 | MIT | Native bindings for Rollup; transitive / platform-dependent |
| @rollup/rollup-linux-riscv64-musl | 4.64.6 | MIT | Native bindings for Rollup; transitive / platform-dependent |
| @rollup/rollup-linux-s390x-gnu | 4.64.6 | MIT | Native bindings for Rollup; transitive / platform-dependent |
| @rollup/rollup-linux-x64-gnu | 4.64.6 | MIT | Native bindings for Rollup; transitive / platform-dependent |
| @rollup/rollup-linux-x64-musl | 4.64.6 | MIT | Native bindings for Rollup; transitive / platform-dependent |
| @rollup/rollup-openbsd-x64 | 4.64.6 | MIT | Native bindings for Rollup; transitive / platform-dependent |
| @rollup/rollup-openharmony-arm64 | 4.64.6 | MIT | Native bindings for Rollup; transitive / platform-dependent |
| @rollup/rollup-win32-arm64-msvc | 4.64.6 | MIT | Native bindings for Rollup; transitive / platform-dependent |
| @rollup/rollup-win32-ia32-msvc | 4.64.6 | MIT | Native bindings for Rollup; transitive / platform-dependent |
| @rollup/rollup-win32-x64-gnu | 4.64.6 | MIT | Native bindings for Rollup; transitive / platform-dependent |
| @rollup/rollup-win32-x64-msvc | 4.64.6 | MIT | Native bindings for Rollup; transitive / platform-dependent |
| @swc/helpers | 0.5.23 | Apache-2.0 | External helpers for the swc project.; transitive / platform-dependent |
| @tailwindcss/node | 4.3.3 | MIT | A utility-first CSS framework for rapidly building custom user interfaces.; transitive / platform-dependent |
| @tailwindcss/oxide-android-arm64 | 4.3.3 | MIT | Tailwind native compiler/scanner or its platform build; transitive / platform-dependent |
| @tailwindcss/oxide-darwin-arm64 | 4.3.3 | MIT | Tailwind native compiler/scanner or its platform build; transitive / platform-dependent |
| @tailwindcss/oxide-darwin-x64 | 4.3.3 | MIT | Tailwind native compiler/scanner or its platform build; transitive / platform-dependent |
| @tailwindcss/oxide-freebsd-x64 | 4.3.3 | MIT | Tailwind native compiler/scanner or its platform build; transitive / platform-dependent |
| @tailwindcss/oxide-linux-arm-gnueabihf | 4.3.3 | MIT | Tailwind native compiler/scanner or its platform build; transitive / platform-dependent |
| @tailwindcss/oxide-linux-arm64-gnu | 4.3.3 | MIT | Tailwind native compiler/scanner or its platform build; transitive / platform-dependent |
| @tailwindcss/oxide-linux-arm64-musl | 4.3.3 | MIT | Tailwind native compiler/scanner or its platform build; transitive / platform-dependent |
| @tailwindcss/oxide-linux-x64-gnu | 4.3.3 | MIT | Tailwind native compiler/scanner or its platform build; transitive / platform-dependent |
| @tailwindcss/oxide-linux-x64-musl | 4.3.3 | MIT | Tailwind native compiler/scanner or its platform build; transitive / platform-dependent |
| @tailwindcss/oxide-wasm32-wasi | 4.3.3 | MIT | Tailwind native compiler/scanner or its platform build; transitive / platform-dependent |
| @tailwindcss/oxide-win32-arm64-msvc | 4.3.3 | MIT | Tailwind native compiler/scanner or its platform build; transitive / platform-dependent |
| @tailwindcss/oxide-win32-x64-msvc | 4.3.3 | MIT | Tailwind native compiler/scanner or its platform build; transitive / platform-dependent |
| @tailwindcss/oxide | 4.3.3 | MIT | Tailwind native compiler/scanner or its platform build; transitive / platform-dependent |
| @tailwindcss/postcss | 4.3.3 | MIT | Tailwind PostCSS build integration; direct development |
| @types/chai | 5.2.3 | MIT | TypeScript definitions for chai; transitive / platform-dependent |
| @types/deep-eql | 4.0.2 | MIT | TypeScript definitions for deep-eql; transitive / platform-dependent |
| @types/estree | 1.0.9 | MIT | TypeScript definitions for estree; transitive / platform-dependent |
| @types/node | 22.20.5 | MIT | TypeScript definitions for node; direct development |
| @types/react-dom | 19.3.0 | MIT | TypeScript definitions for react-dom; direct development |
| @types/react | 19.3.0 | MIT | TypeScript definitions for react; direct development |
| @vitest/expect | 3.2.7 | MIT | Jest's expect matchers as a Chai plugin; transitive / platform-dependent |
| @vitest/mocker | 3.2.7 | MIT | Vitest module mocker implementation; transitive / platform-dependent |
| @vitest/pretty-format | 3.2.7 | MIT | Fork of pretty-format with support for ESM; transitive / platform-dependent |
| @vitest/runner | 3.2.7 | MIT | Vitest test runner; transitive / platform-dependent |
| @vitest/snapshot | 3.2.7 | MIT | Vitest snapshot manager; transitive / platform-dependent |
| @vitest/spy | 3.2.7 | MIT | Lightweight Jest compatible spy implementation; transitive / platform-dependent |
| @vitest/utils | 3.2.7 | MIT | Shared Vitest utility functions; transitive / platform-dependent |
| assertion-error | 2.0.1 | MIT | Error constructor for test and validation frameworks that implements standardized AssertionError specification.; transitive / platform-dependent |
| baseline-browser-mapping | 2.11.28 | Apache-2.0 | A library for obtaining browser versions with their maximum supported Baseline feature set and Widely Available status.; transitive / platform-dependent |
| cac | 6.7.14 | MIT | Simple yet powerful framework for building command-line apps.; transitive / platform-dependent |
| caniuse-lite | 1.0.30001816 | CC-BY-4.0 | A smaller version of caniuse-db, with only the essentials!; transitive / platform-dependent |
| chai | 5.3.3 | MIT | BDD/TDD assertion library for node.js and the browser. Test framework agnostic.; transitive / platform-dependent |
| check-error | 2.1.3 | MIT | Error comparison and information related utility for node and the browser; transitive / platform-dependent |
| client-only | 0.0.1 | MIT | This is a marker package to indicate that a module can only be used in Client Components.; transitive / platform-dependent |
| csstype | 3.2.3 | MIT | Strict TypeScript and Flow types for style based on MDN data; transitive / platform-dependent |
| debug | 4.4.3 | MIT | Lightweight debugging utility for Node.js and the browser; transitive / platform-dependent |
| deep-eql | 5.0.2 | MIT | Improved deep equality testing for Node.js and the browser.; transitive / platform-dependent |
| detect-libc | 2.1.2 | Apache-2.0 | Node.js module to detect the C standard library (libc) implementation family and version; transitive / platform-dependent |
| enhanced-resolve | 5.26.0 | MIT | Offers a async require.resolve function. It's highly configurable.; transitive / platform-dependent |
| es-module-lexer | 1.7.0 | MIT | Lexes ES modules returning their import/export metadata; transitive / platform-dependent |
| esbuild | 0.28.2 | MIT | An extremely fast JavaScript and CSS bundler and minifier.; transitive / platform-dependent |
| estree-walker | 3.0.3 | MIT | Traverse an ESTree-compliant AST; transitive / platform-dependent |
| expect-type | 1.4.0 | Apache-2.0 | Type-level assertions used by test tooling; transitive / platform-dependent |
| fdir | 6.5.0 | MIT | The fastest directory crawler & globbing alternative to glob, fast-glob, & tiny-glob. Crawls 1m files in < 1s; transitive / platform-dependent |
| fsevents | 2.3.3 | MIT | Native Access to MacOS FSEvents; transitive / platform-dependent |
| graceful-fs | 4.2.11 | ISC | A drop-in replacement for fs, making various improvements.; transitive / platform-dependent |
| jiti | 2.7.0 | MIT | Runtime typescript and ESM support for Node.js; transitive / platform-dependent |
| js-tokens | 9.0.1 | MIT | Tiny JavaScript tokenizer.; transitive / platform-dependent |
| lightningcss-android-arm64 | 1.32.0 | MPL-2.0 | A CSS parser, transformer, and minifier written in Rust; transitive / platform-dependent |
| lightningcss-darwin-arm64 | 1.32.0 | MPL-2.0 | A CSS parser, transformer, and minifier written in Rust; transitive / platform-dependent |
| lightningcss-darwin-x64 | 1.32.0 | MPL-2.0 | A CSS parser, transformer, and minifier written in Rust; transitive / platform-dependent |
| lightningcss-freebsd-x64 | 1.32.0 | MPL-2.0 | A CSS parser, transformer, and minifier written in Rust; transitive / platform-dependent |
| lightningcss-linux-arm-gnueabihf | 1.32.0 | MPL-2.0 | A CSS parser, transformer, and minifier written in Rust; transitive / platform-dependent |
| lightningcss-linux-arm64-gnu | 1.32.0 | MPL-2.0 | A CSS parser, transformer, and minifier written in Rust; transitive / platform-dependent |
| lightningcss-linux-arm64-musl | 1.32.0 | MPL-2.0 | A CSS parser, transformer, and minifier written in Rust; transitive / platform-dependent |
| lightningcss-linux-x64-gnu | 1.32.0 | MPL-2.0 | A CSS parser, transformer, and minifier written in Rust; transitive / platform-dependent |
| lightningcss-linux-x64-musl | 1.32.0 | MPL-2.0 | A CSS parser, transformer, and minifier written in Rust; transitive / platform-dependent |
| lightningcss-win32-arm64-msvc | 1.32.0 | MPL-2.0 | A CSS parser, transformer, and minifier written in Rust; transitive / platform-dependent |
| lightningcss-win32-x64-msvc | 1.32.0 | MPL-2.0 | A CSS parser, transformer, and minifier written in Rust; transitive / platform-dependent |
| lightningcss | 1.32.0 | MPL-2.0 | A CSS parser, transformer, and minifier written in Rust; transitive / platform-dependent |
| loupe | 3.2.1 | MIT | Inspect utility for Node.js and browsers; transitive / platform-dependent |
| lucide-react | 0.468.0 | ISC | Interface and social icons; direct runtime |
| magic-string | 0.30.21 | MIT | Modify strings, generate sourcemaps; transitive / platform-dependent |
| ms | 2.1.3 | MIT | Tiny millisecond conversion utility; transitive / platform-dependent |
| nanoid | 3.3.20 | MIT | A tiny (116 bytes), secure URL-friendly unique string ID generator; transitive / platform-dependent |
| next | 16.4.0 | MIT | App Router, build/server and image optimization; direct runtime |
| pathe | 2.0.3 | MIT | Universal filesystem path utils; transitive / platform-dependent |
| pathval | 2.0.1 | MIT | Object value retrieval given a string path; transitive / platform-dependent |
| picocolors | 1.1.1 | ISC | The tiniest and the fastest library for terminal output formatting with ANSI colors; transitive / platform-dependent |
| picomatch | 4.0.7 | MIT | Blazing fast and accurate glob matcher written in JavaScript, with no dependencies and full support for standard and extended Bash glob features, i…; transitive / platform-dependent |
| playwright-core | 1.64.0 | Apache-2.0 | A high-level API to automate web browsers; transitive / platform-dependent |
| playwright | 1.64.0 | Apache-2.0 | A high-level API to automate web browsers; transitive / platform-dependent |
| postcss | 8.5.23 | MIT | Tool for transforming styles with JS plugins; transitive / platform-dependent |
| postcss | 8.5.30 | MIT | Tool for transforming styles with JS plugins; transitive / platform-dependent |
| prettier | 3.9.10 | MIT | Source formatting; direct development |
| react-dom | 19.3.0 | MIT | Browser rendering and server rendering; direct runtime |
| react | 19.3.0 | MIT | React UI and local component state; direct runtime |
| rollup | 4.64.6 | MIT | Next-generation ES module bundler; transitive / platform-dependent |
| scheduler | 0.28.0 | MIT | Cooperative scheduler for the browser environment.; transitive / platform-dependent |
| semver | 7.8.5 | ISC | The semantic version parser used by npm.; transitive / platform-dependent |
| sharp | 0.35.5 | Apache-2.0 | High performance Node.js image processing, the fastest module to resize JPEG, PNG, WebP, GIF, AVIF and TIFF images; transitive / platform-dependent |
| siginfo | 2.0.0 | ISC | Utility module to print pretty messages on SIGINFO/SIGUSR1; transitive / platform-dependent |
| source-map-js | 1.2.2 | BSD-3-Clause | Generates and consumes source maps; transitive / platform-dependent |
| stackback | 0.0.2 | MIT | return list of CallSite objects from a captured stacktrace; transitive / platform-dependent |
| std-env | 3.10.0 | MIT | Runtime agnostic JS utils; transitive / platform-dependent |
| strip-literal | 3.1.0 | MIT | Strip comments and string literals from JavaScript code; transitive / platform-dependent |
| styled-jsx | 5.1.6 | MIT | Full CSS support for JSX without compromises; transitive / platform-dependent |
| tailwindcss | 4.3.3 | MIT | Utility styling framework; direct development |
| tapable | 2.3.3 | MIT | Just a little module for plugins.; transitive / platform-dependent |
| tinybench | 2.9.0 | MIT | Benchmark support for test tooling; transitive / platform-dependent |
| tinyexec | 0.3.2 | MIT | A minimal library for executing processes in Node; transitive / platform-dependent |
| tinyglobby | 0.2.17 | MIT | A fast and minimal alternative to globby and fast-glob; transitive / platform-dependent |
| tinypool | 1.1.1 | MIT | A minimal and tiny Node.js Worker Thread Pool implementation, a fork of piscina, but with fewer features; transitive / platform-dependent |
| tinyrainbow | 2.0.0 | MIT | A small library to print colourful messages.; transitive / platform-dependent |
| tinyspy | 4.0.6 | MIT | A minimal fork of nanospy, with more features; transitive / platform-dependent |
| tslib | 2.8.1 | 0BSD | Runtime library for TypeScript helper functions; transitive / platform-dependent |
| typescript | 5.9.3 | Apache-2.0 | Static type checking; direct development |
| undici-types | 6.21.0 | MIT | A stand-alone types package for Undici; transitive / platform-dependent |
| vite-node | 3.2.4 | MIT | Vite as Node.js runtime; transitive / platform-dependent |
| vite | 7.3.7 | MIT | Native-ESM powered web dev build tool; transitive / platform-dependent |
| vitest | 3.2.7 | MIT | Frontend unit tests; direct development |
| why-is-node-running | 2.3.0 | MIT | Node is running but you don't know why? why-is-node-running is here to help you.; transitive / platform-dependent |
| zod | 4.6.7 | MIT | Frontend input/draft schema validation; direct runtime |

### D3. Runtimes, services, and other tools

| Tool / service | Version / identification | License / terms | Purpose / evidence |
|---|---|---|---|
| Python | Local 3.10.10; deployment minor 3.12 (cloud patch Unconfirmed) | PSF-2.0 and bundled notices | Backend interpreter; `python --version`, `.python-version`. |
| Node.js | Local 24.22.0; package engines 24.x | MIT and bundled third-party notices | Next/build tooling; `node --version`, `package.json`. |
| pnpm | 11.25.0 | MIT | Package manager pinned in `package.json`; lockfile installation. |
| npm CLI | 11.19.1 observed locally | Artistic-2.0 | Optional pnpm/Vercel CLI bootstrap; local package metadata in the Node.js installation, `npm --version`. Not a deployed app dependency. |
| Git | 2.55.0.windows.2 observed | GPL-2.0 | Version control; `git --version`. Not a project library or claim of source authorship. |
| Vercel CLI | 64.2.0 used for local feasibility; owner's pasted initial cloud log used 64.0.2 | Apache-2.0 CLI; hosting is a proprietary service | Deployment tooling; the Vercel deployment section of `readme.md`. CLI is not a runtime application dependency. |
| Vercel Hobby | Hosted service, no package version | Vercel service/Hobby terms; personal noncommercial | Frontend/CDN and Python function. No paid service is requested by this task. |
| GitHub | Hosted service, no package version | GitHub service terms | Public source and submission repository; not an app runtime dependency. |
| Chromium / Chrome for Testing | Playwright revision 1248, build 156.0.8078.4 in the owner's log | BSD-style Chromium plus bundled third-party notices | Desktop and mobile-emulation browser checks; `pnpm exec playwright install chromium`. |
| Playwright-distributed FFmpeg | n7.0.1-playwright-build-1013 | LGPL-2.1-or-later plus bundled third-party notices | Browser recording/test support, not application runtime. Verified with `%LOCALAPPDATA%/ms-playwright/ffmpeg-1013/ffmpeg-win64.exe -L` and its `COPYING.LGPLv2.1`. |
| Playwright Winldd / PrintDeps | Revision 1007 | MIT and Apache-2.0 source notices | Windows dependency checks, not application runtime; [upstream PrintDeps.cpp at Playwright 1.64.0](https://github.com/microsoft/playwright/blob/v1.64.0/browser_patches/winldd/PrintDeps.cpp). Preserve notices if redistributing binaries. |
| Notebook | `notebooks/track_experiments.ipynb`, JSON notebook format | Project-authorship/license decision pending | Reproducible experiments; scripts execute cells without requiring Jupyter in the deployed bundle. |

Codex/OpenAI assistance is disclosed in section E; it is not an open-source runtime library. The local PDF-reading/audit tools used to prepare this inventory are not introduced as application dependencies.

### D4. Published methods and educational sources

| Source to credit | Version / citation | How used / limits |
|---|---|---|
| Simon Martiel and Ali Javadi-Abhari, *Low-overhead error detection with spacetime codes* | [arXiv:2504.15725v1](https://arxiv.org/abs/2504.15725v1), 22 Apr 2025; DOI `10.48550/arXiv.2504.15725` | Scientific basis: localized coherent Pauli spacetime checks, low overhead, restricted non-Clifford support. Library algorithms remain their authors' work; our game does not reproduce the paper's large-device experiments. Paper redistribution license: check the arXiv license link before copying figures; no permission to reuse figures is inferred. |
| qiskit-paulice developers | Package 0.2.1, Apache-2.0 | Actual guarded Clifford check insertion/native search and separate observable experiments; list package documentation/repository from installed metadata when preparing bibliography. |
| Qiskit / Qiskit Aer contributors | Qiskit 2.5.2, Aer 0.17.2, Apache-2.0 | Circuit/state/tableau representation, simulation and generated circuit diagrams. Figures under `public/tutorial-circuits` are Qiskit-generated via the preserved script. |
| Wenyu Sun / IBM Quantum, QFF 2026 Advanced Track prompt | Repo five-page PDF, original prompt title “QFF 2026 Hackathon: Gamifying Error Detection, Mitigation and Correction” | Challenge and learning/judging framing; source author and provider given on brief pp.1/5. Brief redistribution license is Unconfirmed. |
| Stabilizer formalism / Gottesman–Knill | Background method, no package version | Clifford Pauli closure and efficient ideal stabilizer reference; Daniel Gottesman, Stabilizer Codes and Quantum Error Correction (1997), https://arxiv.org/abs/quant-ph/9705052. No full fault-tolerant decoder is implemented. |
| Coherent parity checks and CPC code | Error Correction Zoo CPC entry is referenced by brief p.2 | Conceptual helper/check/readout explanation; not a claim that we implement every CPC code or copy a specific diagram. |
| Shor, CSS, surface-code and qLDPC ideas | Historical/educational references in brief pp.1–2 | Teaching context; select exact primary citations yourselves. Unconfirmed which final bibliography entries the team wants. |
| ZNE-style extrapolation and repetition-code recovery | Small educational implementations in `backend/protection_lab/service.py` | Fit scaled-noise expectations versus encode/parity/recover/decode. Not general mitigation of arbitrary observables or universal quantum error correction. |
| Daniel Litinski, *A Game of Surface Codes* | Quantum 3, 128 (2019), mentioned in brief pp.3–4 | Context/inspiration listed by organizers, not a used software dependency or a claimed implemented surface-code game. |
