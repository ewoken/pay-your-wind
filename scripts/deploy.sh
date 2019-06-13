rm -rf build

mkdir build

node generateIndex.js || exit 1
node generateCharts.js || exit 1

cp -r public/* build/
cp buyObligationPrices.json data
cp -r data build
cp -r CRE_reports build

./node_modules/.bin/gh-pages -d build --message "[ci skip] Circle CI deploy" --user "Circle CI <circleci@circleci.org>"
