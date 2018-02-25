// Copyright (c) 2018 The Regents of the University of Michigan.
// All Rights Reserved. Licensed according to the terms of the Revised
// BSD License. See LICENSE.txt for details.

/* eslint-env mocha */
const expect = require("chai").expect;
const PrimeJob = require("../../lib/primeocr-job");

let job;

describe("PrimeJob", () => {
  it("fails when given an invalid header", () => {
    expect(() => {
      PrimeJob("Some Other Type of Job File\n"
               + "Version 3.90\n"
               + "1\n"
               + "o:\\vol\\path\\00000001.tif\n"
               + "o:\\templates\\whocares.ptm\n");
    }).to.throw(Error);
  });

  it("fails when given a version other than 3.90", () => {
    expect(() => {
      PrimeJob("Prime Recognition Job File\n"
               + "Version 4.00\n"
               + "1\n"
               + "o:\\vol\\path\\00000001.tif\n"
               + "o:\\templates\\whocares.ptm\n");
    }).to.throw(Error);
  });

  it("can handle CRLF jobfiles", () => {
    expect(() => {
      PrimeJob("Prime Recognition Job File\r\n"
               + "Version 3.90\r\n"
               + "1\r\n"
               + "o:\\vol\\path\\00000001.tif\r\n"
               + "o:\\templates\\whocares.ptm\r\n");
    }).not.to.throw();
  });

  it("can handle CR jobfiles", () => {
    expect(() => {
      PrimeJob("Prime Recognition Job File\r"
               + "Version 3.90\r"
               + "1\r"
               + "o:\\vol\\path\\00000001.tif\r"
               + "o:\\templates\\whocares.ptm\r");
    }).not.to.throw();
  });
});

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

describe("PrimeJob with a new volume path", () => {
  beforeEach(() => {
    job = PrimeJob("Prime Recognition Job File\n"
                   + "Version 3.90\n"
                   + "1\n"
                   + "o:\\other\\path\\00000001.tif\n"
                   + "o:\\templates\\whocares.ptm\n");
  });

  it("knows to look in the right volume path", () => {
    expect(job.volumePaths()).to.deep.equal(["other/path"]);
  });
});
