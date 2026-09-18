#!/usr/bin/env sh

# Keep execution at the end so an incomplete function body is not executed.
install_instructions() (
  set -eu

  preview=false
  force=false
  agents=''
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --help|-h)
        printf '%s\n' \
          'Usage: install-instructions.sh --agent <codex|opencode> [...] [--preview] [--force]' \
          'Install shared Instructions and links only for explicitly selected agents.' \
          '--preview shows destinations without installing. --force permits replacement after reviewing existing files.'
        exit 0
        ;;
      --preview) preview=true ;;
      --force) force=true ;;
      --agent)
        shift
        count=0
        while [ "$#" -gt 0 ]; do
          case "$1" in
            --*) break ;;
            codex|opencode) agents="$agents $1" ;;
            *) printf '%s\n' 'error: supported Instructions agents: codex, opencode' >&2; exit 2 ;;
          esac
          count=$((count + 1))
          shift
        done
        [ "$count" -gt 0 ] || { printf '%s\n' 'error: --agent requires a name' >&2; exit 2; }
        continue
        ;;
      --*) printf 'error: unknown option: %s\n' "$1" >&2; exit 2 ;;
      *) printf 'error: unknown argument: %s\n' "$1" >&2; exit 2 ;;
    esac
    shift
  done
  if [ "$preview" = true ] && [ "$force" = true ]; then
    printf '%s\n' 'error: --force cannot be combined with --preview' >&2
    exit 2
  fi

  [ -n "$agents" ] || { printf '%s\n' 'error: --agent is required; no default agents' >&2; exit 2; }

  for tool in node curl; do
    command -v "$tool" >/dev/null 2>&1 || {
      printf 'error: %s is required; no software was installed\n' "$tool" >&2
      exit 3
    }
  done

  temporary=$(mktemp -d "${TMPDIR:-/tmp}/install-instructions.XXXXXX")
  trap 'rm -rf "$temporary"' EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM
  curl --fail --silent --show-error --location --proto '=https' --proto-redir '=https' \
    --connect-timeout 10 --max-time 60 --max-filesize 1048576 \
    https://raw.githubusercontent.com/JZP1996/agentarium/HEAD/instructions/install-instructions.js \
    --output "$temporary/install-instructions.js"

  # Only allowlisted names are split into separate arguments.
  set -- --agent $agents
  if [ "$preview" = false ]; then set -- "$@" --install; fi
  if [ "$force" = true ]; then set -- "$@" --force; fi
  # Do not let a child process consume the remaining curl-to-shell input.
  node "$temporary/install-instructions.js" "$@" < /dev/null
)

install_instructions "$@"
