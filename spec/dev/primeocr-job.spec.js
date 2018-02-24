// Copyright (c) 2018 The Regents of the University of Michigan.
// All Rights Reserved. Licensed according to the terms of the Revised
// BSD License. See LICENSE.txt for details.

/* eslint-env mocha */
const expect = require("chai").expect;
const PrimeJob = require("../../lib/primeocr-job");

let job;

describe("PrimeJob with only 00000001.tif", () => {
  beforeEach(() => {
    job = PrimeJob("Prime Recognition Job File\n"
                   + "Version 3.90\n"
                   + "1\n"
                   + "o:\\vol\\path\\00000001.tif\n"
                   + "o:\\templates\\whocares.ptm\n");
  });

  it("knows to look in the right volume path", () => {
    expect(job.volumePaths()).to.deep.equal(["vol/path"]);
  });
});
