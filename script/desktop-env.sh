#!/usr/bin/env bash
# Source from project-root scripts. Local tools are optional; standard installs work too.
if [[ -x "$PWD/.tools/cargo/bin/cargo" ]]; then
  export CARGO_HOME="$PWD/.tools/cargo"
  export RUSTUP_HOME="$PWD/.tools/rustup"
  export PATH="$CARGO_HOME/bin:$PATH"
fi
if ! command -v node >/dev/null 2>&1; then
  for candidate in "$PWD"/.tools/emsdk/node/*/bin; do
    if [[ -x "$candidate/node" ]]; then export PATH="$candidate:$PATH"; break; fi
  done
fi
