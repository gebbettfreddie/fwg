#!/bin/sh
# Push apps-script/ plus the current CV PDF to the "Send CV" web app and keep its URL.
# Stages in ../fwg-cv/send-cv (private, never pushed) so the PDF stays out of this repo.
# First run creates the script and deployment; later runs update the same deployment.
set -eu
here=$(cd "$(dirname "$0")/.." && pwd)
cv="$here/../fwg-cv"
stage="$cv/send-cv"
pdf="$cv/Freddie_Gebbett_CV.pdf"
desc="CV $(date +%F)"
mkdir -p "$stage"
cd "$stage"
# create-script writes a default manifest, so it must run before our files are copied in
[ -f .clasp.json ] || clasp create-script --type webapp --title "Send CV" --rootDir .
cp "$here/apps-script/send-cv.gs" "$here/apps-script/appsscript.json" "$stage/"
printf 'const CV_PDF_B64 = "%s";\n' "$(base64 < "$pdf" | tr -d '\n')" > "$stage/cv.gs"
clasp push --force
if [ -f .deployment ]; then
  clasp update-deployment "$(cat .deployment)" --description "$desc"
else
  clasp create-deployment --description "$desc" --json \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);process.stdout.write(j.deploymentId||j.id)})' > .deployment
fi
echo "https://script.google.com/macros/s/$(cat .deployment)/exec"
