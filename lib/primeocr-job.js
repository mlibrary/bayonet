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
    return [getVolumePath(lines[3])];
  };

  return job;
};

const getLines = data =>
  data.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

const getVolumePath = line =>
  line.match(/^.:\\(.+)\\[^\\]+$/)[1].replace(/\\/g, "/");
