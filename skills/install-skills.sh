#!/usr/bin/env sh

# Keep execution at the end so an incomplete function body is not executed.
install_skills() (
  set -eu

  preview=false
  force=false
  agents=''
  catalog=''
  catalog_set=false
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --help|-h)
        printf '%s\n' \
          'Usage: install-skills.sh [catalog.json|https://...] --agent <name...> [--preview] [--force]' \
          'Default: install all Agentarium Skills and the awesome-skills selection through Skills CLI.' \
          '--preview prints commands without installing. --force permits replacement, not old ownership conflicts.'
        exit 0
        ;;
      --preview) preview=true ;;
      --force) force=true ;;
      --agent)
        shift
        count=0
        while [ "$#" -gt 0 ]; do
          case "$1" in --*) break ;; esac
          case "$1" in ''|*[!a-z0-9-]*|-*|*-|*--*) printf '%s\n' 'error: invalid agent name' >&2; exit 2 ;; esac
          agents="$agents $1"
          count=$((count + 1))
          shift
        done
        [ "$count" -gt 0 ] || { printf '%s\n' 'error: --agent requires a name' >&2; exit 2; }
        continue
        ;;
      --*) printf 'error: unknown option: %s\n' "$1" >&2; exit 2 ;;
      *)
        if [ "$catalog_set" = true ] || [ -z "$1" ]; then
          printf '%s\n' 'error: supply at most one non-empty catalog path or HTTPS URL' >&2
          exit 2
        fi
        catalog="$1"
        catalog_set=true
        ;;
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
  if [ "$preview" = false ]; then
    command -v npx >/dev/null 2>&1 || {
      printf '%s\n' 'error: npx is required; no software was installed' >&2
      exit 3
    }
  fi

  temporary=$(mktemp -d "${TMPDIR:-/tmp}/install-skills.XXXXXX")
  trap 'rm -rf "$temporary"' EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM
  curl --fail --silent --show-error --location --proto '=https' --proto-redir '=https' \
    --connect-timeout 10 --max-time 60 --max-filesize 1048576 \
    https://raw.githubusercontent.com/JZP1996/agentarium/HEAD/skills/install-skills.js \
    --output "$temporary/install-skills.js"

  set --
  if [ "$catalog_set" = true ]; then set -- "$catalog"; fi
  if [ "$preview" = false ]; then set -- "$@" --install; fi
  if [ "$force" = true ]; then set -- "$@" --force; fi
  # Agent names contain only validated lowercase letters, digits and hyphens.
  set -- "$@" --agent $agents
  # Do not let a child process consume the remaining curl-to-shell input.
  node "$temporary/install-skills.js" "$@" < /dev/null
)

install_skills "$@"
