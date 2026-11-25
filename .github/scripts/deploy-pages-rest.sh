#!/usr/bin/env bash
# Deploy GitHub Pages via REST, bypassing the @actions/artifact twirp index lag.
# deploy-pages@v4 lists artifacts through twirp (ArtifactService/ListArtifacts),
# which can lag behind the REST index and report "Found 0 artifact(s)".
# REST artifact lookup + POST /pages/deployments is the same deployment API deploy-pages calls.
set -uo pipefail

REPO="${REPO:?REPO required}"
RUN_ID="${RUN_ID:?RUN_ID required}"
BUILD_VERSION="${BUILD_VERSION:?BUILD_VERSION required}"
SITE_URL="${SITE_URL:-}"

echo "::group::Locate github-pages artifact via REST"
ids=""
keep=""
for i in $(seq 1 10); do
  ids=$(gh api "repos/${REPO}/actions/runs/${RUN_ID}/artifacts" --jq '.artifacts[] | select(.name=="github-pages") | .id' 2>/dev/null || true)
  keep=$(echo "${ids}" | grep -E '^[0-9]+$' | sort -n | tail -1)
  if [ -n "${keep}" ]; then
    echo "artifact ids: [${ids}] (attempt ${i})"
    break
  fi
  echo "artifact not visible via REST yet (attempt ${i}), waiting 6s"
  sleep 6
done
if [ -z "${keep}" ]; then
  echo "::error::no github-pages artifact visible via REST"
  exit 1
fi
echo "using artifact ${keep}"
for id in ${ids}; do
  if [ "${id}" != "${keep}" ]; then
    echo "deleting duplicate artifact ${id}"
    gh api -X DELETE "repos/${REPO}/actions/artifacts/${id}" >/dev/null 2>&1 || true
  fi
done

echo "::group::Fetch OIDC token"
oidc_raw=$(curl -sS -H "Authorization: bearer ${ACTIONS_ID_TOKEN_REQUEST_TOKEN}" "${ACTIONS_ID_TOKEN_REQUEST_URL}&audience=api.github.com")
oidc=$(echo "${oidc_raw}" | jq -r '.value // empty')
if [ -z "${oidc}" ]; then
  echo "::error::could not obtain OIDC token"
  exit 1
fi

echo "::group::Create Pages deployment"
payload=$(jq -n --argjson a "${keep}" --arg v "${BUILD_VERSION}" --arg t "${oidc}" '{artifact_id: $a, pages_build_version: $v, oidc_token: $t}')
echo "payload artifact_id type: $(echo "${payload}" | jq -r '.artifact_id|type')"
echo "payload artifact_id value: $(echo "${payload}" | jq -r '.artifact_id')"
echo "${payload}" | gh api -X POST -H "Content-Type: application/json" "repos/${REPO}/pages/deployments" --input - > deploy_resp.json 2> deploy_err.txt
rc=$?
if [ "${rc}" -ne 0 ]; then
  echo "::warning::REST deployment request failed:"
  cat deploy_err.txt
  exit 1
fi
dep=$(jq -r '.id // empty' deploy_resp.json)
echo "deployment id: ${dep}"
jq '{id, status, url, message}' deploy_resp.json 2>/dev/null || cat deploy_resp.json
if [ -z "${dep}" ]; then
  echo "::error::no deployment id returned"
  exit 1
fi

echo "::group::Poll deployment status"
for i in $(seq 1 40); do
  st=$(gh api "repos/${REPO}/pages/deployments/${dep}" --jq '.status' 2>/dev/null || true)
  echo "poll ${i}: ${st}"
  case "${st}" in
    built)
      if [ -n "${SITE_URL}" ]; then
        echo "page_url=${SITE_URL}" >> "${GITHUB_OUTPUT}"
      fi
      echo "deployment built"
      exit 0
      ;;
    errored)
      echo "::error::pages deployment errored"
      exit 1
      ;;
  esac
  sleep 10
done
echo "::error::timed out waiting for pages deployment"
exit 1