// Copyright (c) 2018 The Regents of the University of Michigan.
// All Rights Reserved. Licensed according to the terms of the Revised
// BSD License. See LICENSE.txt for details.

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
    for (const key in templates)
      if (templates.hasOwnProperty(key))
        internal.extensions.set(key, getExtension(templates[key]));
  };

  job.outputExtension = function(file) {
    return internal.extensions.get(file);
  };

  job.addFiles = function() {
  };

  job.filesToDelete = function() {
    return [];
  };

  job.isComplete = function() {
    return true;
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
