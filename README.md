Node Quickstart
===============

[![Build Status][status-image]][travis]
[![Test Coverage][cover-image]][coverage]

Tutorial for a new project
--------------------------

```bash session
$ mkdir path/to/your/new/project
$ cd path/to/your/new/project
$ git clone git@github.com:mlibrary/node-quickstart .
$ ./configure
```

When running `./configure`, you'll be asked a series of questions. You
should be ready with:

1.  A project name (e.g. if you pick `hello`, your project will live at
    `mlibrary/hello`)
2.  A brief project description
3.  Your own name

It will:

-   check that you have npm installed,
-   check that you have a working test environment,
-   overwrite package.json and README.md,
-   set the correct git origin url,
-   delete itself, and
-   if everything worked, run `git commit`

Tutorial for an existing project
--------------------------------

### By hand ###

One method is to simply look at the files in this repository and copy
them as-they-are into your own.

These four files can be copied without making changes:
-   .eslint.json
-   .travis.yml
-   COPYRIGHT.txt
-   LICENSE.txt

These five files can be ignored:
-   configure
-   README.md
-   index.js
-   lib/nothing.js
-   spec/nothing.spec.js

Make sure this line is in your `.gitignore`:

```text
node_modules/
```

Lastly, I recommend you generate `package.json` by running

```bash session
$ npm init
```

and answering its prompts (if you haven't already). You can install dev
dependencies with the following:

```bash session
$ npm install --save-dev chai coveralls eslint istanbul mocha eslint-{plugin-{import,node,promise,standard},config-standard}
```

### Or you can do it using `./configure` ###

1.  Follow the instructions for a new project in a new folder.
2.  Copy the resulting files into your old project.
3.  Delete the project you created in step 1.

Now what?
---------

Your test files go under the `spec/` directory, and I suggest that you
put your code under the `lib/` directory with relative includes to your
public-facing stuff in `index.js`.

At the moment, `spec/nothing.spec.js` and `lib/nothing.js` serve as
examples. The testing environment is [mocha][1] with the [chai][2]
assertion library. Every test file should have these lines near the top:

```javascript
/* eslint-env mocha */
const expect = require("chai").expect;
```

With that, you can safely delete both `nothing` files.

You can run tests with

```bash session
$ npm test
```

The linter is [ESLint][3], which is highly configurable using the
`.eslintrc.json` file. You can (and should) run the linter with

```bash session
$ npm run lint
```

By default, [travis][4] is set up to run the linter, run the tests, and
submit test coverage data to [coveralls][5]. You can add or drop support
for different versions of node using `.travis.yml`.

If you want to run test files that are not under the `spec/` Directory,
you should alter the `test` and `travis` scripts in `package.json`. The
last argument in each is `spec`---you can add additional directories
separated by whitespace or you can change `spec` to something else.

If you change the `test` script, it will change where `npm test` looks
for tests. If you change the `travis` script, it will change where
travis looks for tests.

For example, you could put some tests in a directory called `slow-tests`
and then add `slow-tests` after `spec` in the `travis` script line.
Those tests will be ignored when you run `npm test` but will still be
run by travis every time you push to github.

[1]: https://mochajs.org
[2]: http://chaijs.com/api/bdd/
[3]: https://eslint.org/docs/rules/
[4]: https://docs.travis-ci.com/user/languages/javascript-with-nodejs/
[5]: https://coveralls.io
[travis]:       https://travis-ci.org/mlibrary/node-quickstart
[status-image]: https://travis-ci.org/mlibrary/node-quickstart.svg?branch=master
[coverage]:     https://coveralls.io/github/mlibrary/node-quickstart
[cover-image]:  https://coveralls.io/repos/github/mlibrary/node-quickstart/badge.svg?branch=master
