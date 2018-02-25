// Copyright (c) 2018 The Regents of the University of Michigan.
// All Rights Reserved. Licensed according to the terms of the Revised
// BSD License. See LICENSE.txt for details.

module.exports = function(fileData) {
  const job = {};
  const lines = getLines(fileData);

  if (lines[0] !== "Prime Recognition Job File")
    throw Error("Expected 'Prime Recognition Job File'");

  if (lines[1] !== "Version 3.90")
    throw Error("Expected jobfile version 3.90");

  job.volumePaths = function() {
    const paths = [];

    for (let i = 3; i < lines.length; i += 2)
      paths.push(getVolumePath(lines, i));

    return paths;
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