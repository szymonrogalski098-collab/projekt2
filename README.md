# MLingo

Duolingo-style PWA for learning AI/ML. Pure HTML/CSS/JS, no build step.

Coding tasks are optional (skip button, or switch them off in Profile) and can be solved in JavaScript or C++. C++ runs in the bundled JSCPP interpreter (js/vendor/jscpp.js, MIT).

## Run
The service worker (install + offline) needs http(s) or localhost:

    npx serve .
    # or
    python -m http.server 8000

Opening index.html directly also works, but without install/offline support.

## Validate content
    node tools/validate.js

Recomputes every numeric answer, runs all coding solutions, checks for emojis.

## Release
Bump VERSION in sw.js when you change any asset.
