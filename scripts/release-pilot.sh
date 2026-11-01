#!/usr/bin/env bash
# Usage: scripts/release-pilot.sh <new-version> [version_name]
# Bumps the manifest, validates the extension and builds release/frappe-pilot-<version>.zip.
# It never uploads anything; the store upload stays a manual step.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXT="$ROOT/frappe-pilot"
MANIFEST="$EXT/manifest.json"

NEW="${1:-}"
NAME="${2:-}"
[ -n "$NEW" ] || { echo "Usage: $0 <new-version> [version_name]"; exit 1; }
[[ "$NEW" =~ ^[0-9]+(\.[0-9]+){0,3}$ ]] || { echo "Version must be numeric like 1.0.2"; exit 1; }

cd "$ROOT"
if [ -n "$(git status --porcelain -- frappe-pilot)" ]; then
    echo "Uncommitted changes in frappe-pilot/. Commit them first so the zip matches git."; exit 1
fi

CURRENT="$(python3 -c "import json;print(json.load(open('$MANIFEST'))['version'])")"
if [ "$(printf '%s\n%s\n' "$CURRENT" "$NEW" | sort -V | tail -1)" != "$NEW" ] || [ "$CURRENT" = "$NEW" ]; then
    echo "New version $NEW must be higher than the store's current $CURRENT."; exit 1
fi

for f in "$EXT"/*.js; do node --check "$f"; done

python3 - "$MANIFEST" "$NEW" "$NAME" <<'EOF'
import re, sys
path, new, name = sys.argv[1:4]
s = open(path).read()
s = re.sub(r'("version"\s*:\s*)"[^"]*"', lambda m: m.group(1) + '"' + new + '"', s, count=1)
if name:
    s = re.sub(r'("version_name"\s*:\s*)"[^"]*"', lambda m: m.group(1) + '"' + name + '"', s, count=1)
open(path, "w").write(s)
EOF

python3 - "$EXT" <<'EOF'
import json, os, sys
ext = sys.argv[1]
m = json.load(open(os.path.join(ext, "manifest.json")))
refs = set()
refs.add(m["background"]["service_worker"])
refs.add(m["action"]["default_popup"])
refs.update(m.get("icons", {}).values())
for cs in m.get("content_scripts", []):
    refs.update(cs.get("js", []) + cs.get("css", []))
for war in m.get("web_accessible_resources", []):
    refs.update(war["resources"])
missing = [r for r in refs if not os.path.exists(os.path.join(ext, r))]
if missing:
    sys.exit("Manifest references missing files: " + ", ".join(missing))
EOF

mkdir -p "$ROOT/release"
ZIP="$ROOT/release/frappe-pilot-$NEW.zip"
rm -f "$ZIP"
(cd "$EXT" && zip -q -X "$ZIP" icon.png manifest.json background.js content.js inject.js popup.html popup.js tabs.js styles.css)

echo
echo "Built $ZIP"
unzip -l "$ZIP" | tail -n +4
cat <<EOF

Next steps:
 1. git add frappe-pilot/manifest.json && git commit   (message: "Bump to $NEW")
 2. Chrome Web Store dashboard > Frappe Pilot > Package > Upload new package > $ZIP
    Item ID: bnibgaanaemplgmnlgimehepncpbpcdi. Submit for review; it auto-publishes on approval.
 3. Optional: Edge Add-ons (Partner Center) with the same zip.
 4. After approval: git tag v$NEW && git push origin main --tags, then publish a GitHub release with the zip.
 5. Log it in the vault: Frappe Pilot/Changes.md
EOF
