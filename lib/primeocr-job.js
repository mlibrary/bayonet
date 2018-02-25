// Copyright (c) 2018 The Regents of the University of Michigan.
// All Rights Reserved. Licensed according to the terms of the Revised
// BSD License. See LICENSE.txt for details.

module.exports = function(fileData) {
  const job = {};
  const internal = {};

  internal.lines = getLines(fileData);
  internal.extensions = new Map();

  if (internal.lines[0] !== "Prime Recognition Job File")
    throw Error("Expected 'Prime Recognition Job File'");

  if (internal.lines[1] !== "Version 3.90")
    throw Error("Expected jobfile version 3.90");

  job.volumePaths = function() {
    const paths = new Set();

    for (let i = 3; i < internal.lines.length; i += 2)
      paths.add(getVolumePath(internal.lines, i));

    return [...paths];
  };

  job.templatePaths = function() {
    const templates = new Set();

    for (let i = 4; i < internal.lines.length; i += 2)
      templates.add(getTemplatePath(internal.lines, i));

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

  return job;
};

const getLines = data =>
  data.trim().replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

const getVolumePath = (lines, n) => {
  const match = lines[n].match(/^.:\\(.+)\\[^\\]+$/);

  if (!match)
    throw Error(
      "Invalid image path on line " + (n + 1) + ": " + lines[n]);

  return match[1].replace(/\\/g, "/");
};

const getTemplatePath = (lines, n) => {
  const match = lines[n].match(/^.:\\(.+)$/);

  if (!match)
    throw Error(
      "Invalid template path on line " + (n + 1) + ": " + lines[n]);

  return match[1].replace(/\\/g, "/");
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
