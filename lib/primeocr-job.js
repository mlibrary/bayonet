// Copyright (c) 2018 The Regents of the University of Michigan.
// All Rights Reserved. Licensed according to the terms of the Revised
// BSD License. See LICENSE.txt for details.

const forEachIn = require("./for-each-object");

module.exports = function(fileData) {
  const job = {};
  const internal = {};

  internal.lines = getLines(fileData);
  setUpAndValidate(internal);

  job.volumePaths = function() {
    const paths = new Set();

    for (const pattern of internal.imagePatterns)
      paths.add(pattern.volume);

    return [...paths];
  };

  job.templatePaths = function() {
    const templates = new Set();

    for (const pattern of internal.imagePatterns)
      templates.add(pattern.template);

    return [...templates];
  };

  job.addTemplates = function(templates) {
    forEachIn(templates, (value, key) => {
      internal.extensions.set(key, getExtension(value));
    });
  };

  job.outputExtension = function(file) {
    return internal.extensions.get(file);
  };

  job.addFiles = function(files) {
    internal.existingFiles = new Map();
    forEachIn(files, (file, path) => {
      internal.existingFiles.set(path, new Map());
    });

    internal.existingFiles.forEach((names, path) => {
      for (const file of files[path]) {
        if (file === "confid.txt")
          continue;

        const match = file.match(/^(.+)\.([^.]+)$/);

        if (!names.has(match[1])) {
          names.set(match[1], {});
          names.get(match[1]).expected
            = internal.extensions.values().next().value;
          names.get(match[1]).existing = new Set();
        }

        names.get(match[1]).existing.add(match[2]);
      }
    });

    internal.filesToDelete = [];
    internal.isComplete = true;

    internal.existingFiles.forEach((names, path) => {
      names.forEach((extensions, name) => {
        if (extensions.existing.has(extensions.expected)) {
          extensions.existing.delete(extensions.expected);
          for (const ext of extensions.existing)
            internal.filesToDelete.push(path + "/" + name + "." + ext);
        } else {
          internal.isComplete = false;
          if (extensions.existing.has("blk"))
            internal.filesToDelete.push(path + "/" + name + ".blk");
        }
      });
    });
  };

  job.filesToDelete = function() {
    return internal.filesToDelete;
  };

  job.isComplete = function() {
    return internal.isComplete;
  };

  return job;
};

const setUpAndValidate = internal => {
  if (internal.lines[0] !== "Prime Recognition Job File")
    throw Error("Expected 'Prime Recognition Job File'");

  if (internal.lines[1] !== "Version 3.90")
    throw Error("Expected jobfile version 3.90");

  internal.extensions = new Map();
  internal.imagePatterns = [];

  for (let i = 3; i < internal.lines.length; i += 2)
    internal.imagePatterns.push(getTemplatePair(internal.lines, i));
};

const getLines = data =>
  data.trim().replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

const getTemplatePair = (lines, n) => {
  const imageMatch = lines[n].match(/^.:\\(.+)\\([^\\]+)$/);
  const templateMatch = lines[n + 1].match(/^.:\\(.+)$/);

  if (!imageMatch)
    throw Error(
      "Invalid image pattern on line " + (n + 1) + ": " + lines[n]);

  if (!templateMatch)
    throw Error(
      "Invalid template path on line " + (n + 2) + ": " + lines[n + 1]);

  return {
    "volume": imageMatch[1].replace(/\\/g, "/"),
    "image": imageMatch[2],
    "template": templateMatch[1].replace(/\\/g, "/")
  };
};

const getExtension = templateFile => {
  const lines = getLines(templateFile);
  const match = lines[3].match(/^([0-9]+),/);

  switch (match[1]) {
  case "0":
    return "txt";

  case "9":
    return "rtf";

  case "13":
    return "pdf";

  case "22":
    return "xml";
  }
};
