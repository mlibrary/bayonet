// Copyright (c) 2018 The Regents of the University of Michigan.
// All Rights Reserved. Licensed according to the terms of the Revised
// BSD License. See LICENSE.txt for details.

module.exports = function(fileData) {
  const job = {};
  const lines = fileData.split("\n");

  if (lines[1] !== "Version 3.90")
    throw Error("Expected jobfile version 3.90");

  job.volumePaths = () => ["vol/path"];

  return job;
};
