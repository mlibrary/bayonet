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
                   + "o:\\templates\\only-template.ptm\n");
  });

  it("knows to look in the right volume path", () => {
    expect(job.volumePaths()).to.have.members(["vol/path"]);
  });

  it("asks to view templates/only-template.ptm", () => {
    expect(job.templatePaths()).to.have.members([
      "templates/only-template.ptm"
    ]);
  });

  describe("when given a template file for txt output", () => {
    beforeEach(() => {
      job.addTemplates({
        "templates/only-template.ptm":
          "Prime Recognition Document Template\n\n"
          + "Version 3.90\n"
          + "0,1\n"
          + "1,0,0,0,10,1,12,0,0,0\n"
          + "1\n"
          + "0,0,1,999999,100,200,500,5000\n"
      });
    });

    it("expects an output extension of .txt", () => {
      expect(job.outputExtension("templates/only-template.ptm"))
        .to.equal("txt");
    });
  });
});

describe("PrimeJob with two images in the same directory", () => {
  beforeEach(() => {
    job = PrimeJob("Prime Recognition Job File\n"
                   + "Version 3.90\n"
                   + "2\n"
                   + "o:\\only\\path\\00000001.tif\n"
                   + "o:\\templates\\first.ptm\n"
                   + "o:\\only\\path\\00000002.tif\n"
                   + "o:\\templates\\second.ptm\n");
  });

  it("finds the only volume path", () => {
    expect(job.volumePaths()).to.have.members(["only/path"]);
  });

  it("asks to view both template files", () => {
    expect(job.templatePaths()).to.have.members([
      "templates/first.ptm",
      "templates/second.ptm"
    ]);
  });
});

describe("PrimeJob with two images in different directories", () => {
  beforeEach(() => {
    job = PrimeJob("Prime Recognition Job File\n"
                   + "Version 3.90\n"
                   + "2\n"
                   + "o:\\first\\path\\00000001.tif\n"
                   + "o:\\templates\\shared.ptm\n"
                   + "o:\\second\\path\\00000001.tif\n"
                   + "o:\\templates\\shared.ptm\n");
  });

  it("finds both volume paths", () => {
    expect(job.volumePaths()).to.have.members([
      "first/path",
      "second/path"
    ]);
  });

  it("asks to view the only template file", () => {
    expect(job.templatePaths()).to.have.members([
      "templates/shared.ptm"
    ]);
  });
});
