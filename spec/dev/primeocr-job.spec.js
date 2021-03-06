// Copyright (c) 2018 The Regents of the University of Michigan.
// All Rights Reserved. Licensed according to the terms of the Revised
// BSD License. See LICENSE.txt for details.

// Note: this doesn't handle any job syntaxes more advanced than
// asterisk wildcards. That is, it doesn't handle the following
// characters in an image path:
// -   ?
// -   [...]
// -   +
//
// No wildcards are supported in the template path, and even the
// asterisk isn't supported until we've entered the volume path. For
// example, o:\path\to\*\image.tif won't match o:\path\to\any\image.tif.
//
// I don't foresee any need for me to implement any of that, so I put
// the note here. If you need any of that, make an issue, or, better
// yet, a pull request.

/* eslint-env mocha */
/* eslint-disable no-unused-expressions */
const expect = require("chai").expect;
const PrimeJob = require("../..").PrimeJob;
const Buffer = require("safe-buffer").Buffer;

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

  it("fails when given an invalid image pattern", () => {
    expect(() => {
      PrimeJob("Prime Recognition Job File\n"
               + "Version 3.90\n"
               + "1\n"
               + "o:\\vol\\path\\\n"
               + "o:\\templates\\whocares.ptm\n");
    }).to.throw(Error);
  });

  it("fails when given an invalid template path", () => {
    expect(() => {
      PrimeJob("Prime Recognition Job File\n"
               + "Version 3.90\n"
               + "1\n"
               + "o:\\vol\\path\\00000001.tif\n"
               + "o:templates\\whocares.ptm\n");
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

  it("can handle buffers instead of strings", () => {
    expect(() => {
      PrimeJob(Buffer.from("Prime Recognition Job File\n"
               + "Version 3.90\n"
               + "1\n"
               + "o:\\vol\\path\\00000001.tif\n"
               + "o:\\templates\\whocares.ptm\n", "binary"));
    }).not.to.throw();
  });

  it("allows 'Version=3.90' as well as 'Version 3.90'", () => {
    expect(() => {
      PrimeJob("Prime Recognition Job File\n"
               + "Version=3.90\n"
               + "1\n"
               + "o:\\vol\\path\\00000001.tif\n"
               + "o:\\templates\\whocares.ptm\n");
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

    describe("when told about 00000001.txt and confid.txt", () => {
      beforeEach(() => {
        job.addFiles({
          "vol/path": [
            "00000001.txt",
            "confid.txt"
          ]
        });
      });

      it("asks to delete no files", () => {
        expect(job.filesToDelete()).to.deep.equal([]);
      });

      it("knows it's complete", () => {
        expect(job.isComplete()).to.equal(true);
      });
    });

    describe("when told about 00000001.txt, confid.txt, and Thumbs.db", () => {
      beforeEach(() => {
        job.addFiles({
          "vol/path": [
            "00000001.txt",
            "confid.txt",
            "Thumbs.db"
          ]
        });
      });

      it("asks to delete Thumbs.db", () => {
        expect(job.filesToDelete()).to.have.members([
          "vol/path/Thumbs.db"
        ]);
      });

      it("knows it's complete", () => {
        expect(job.isComplete()).to.equal(true);
      });
    });

    describe("when told about 00000001.tif and confid.txt", () => {
      beforeEach(() => {
        job.addFiles({
          "vol/path": [
            "00000001.tif",
            "confid.txt"
          ]
        });
      });

      it("asks to delete no files", () => {
        expect(job.filesToDelete()).to.deep.equal([]);
      });

      it("knows it's incomplete", () => {
        expect(job.isComplete()).to.equal(false);
      });
    });

    describe("when told about 00000001.tif and 00000001.txt", () => {
      beforeEach(() => {
        job.addFiles({
          "vol/path": [
            "00000001.tif",
            "00000001.txt"
          ]
        });
      });

      it("asks to delete 00000001.tif", () => {
        expect(job.filesToDelete()).to.have.members([
          "vol/path/00000001.tif"
        ]);
      });

      it("knows it's complete", () => {
        expect(job.isComplete()).to.equal(true);
      });
    });

    describe("when told about 00000001.tif and 00000001.blk", () => {
      beforeEach(() => {
        job.addFiles({
          "vol/path": [
            "00000001.tif",
            "00000001.blk"
          ]
        });
      });

      it("asks to delete 00000001.blk", () => {
        expect(job.filesToDelete()).to.have.members([
          "vol/path/00000001.blk"
        ]);
      });

      it("knows it's incomplete", () => {
        expect(job.isComplete()).to.equal(false);
      });
    });

    describe("when told about 00000001.txt and 00000001.blk", () => {
      beforeEach(() => {
        job.addFiles({
          "vol/path": [
            "00000001.txt",
            "00000001.blk"
          ]
        });
      });

      it("asks to delete 00000001.blk", () => {
        expect(job.filesToDelete()).to.have.members([
          "vol/path/00000001.blk"
        ]);
      });

      it("knows it's complete", () => {
        expect(job.isComplete()).to.equal(true);
      });
    });

    describe("when told about 00000001.txt and 00000002.blk", () => {
      beforeEach(() => {
        job.addFiles({
          "vol/path": [
            "00000001.txt",
            "00000002.blk"
          ]
        });
      });

      it("asks to delete no files", () => {
        expect(job.filesToDelete()).to.deep.equal([]);
      });

      it("knows it's complete", () => {
        expect(job.isComplete()).to.equal(true);
      });
    });
  });

  describe("when given a template file for rtf output", () => {
    beforeEach(() => {
      job.addTemplates({
        "templates/only-template.ptm":
          "Prime Recognition Document Template\n\n"
          + "Version 3.90\n"
          + "9,1\n"
          + "1,0,0,0,10,1,12,0,0,0\n"
          + "1\n"
          + "0,0,1,999999,100,200,500,5000\n"
      });
    });

    it("expects an output extension of .rtf", () => {
      expect(job.outputExtension("templates/only-template.ptm"))
        .to.equal("rtf");
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

  describe("when given differing template file outputs", () => {
    beforeEach(() => {
      job.addTemplates({
        "templates/first.ptm":
          "Prime Recognition Document Template\n\n"
          + "Version 3.90\n"
          + "13,1\n"
          + "1,0,0,0,10,1,12,0,0,0\n"
          + "1\n"
          + "0,0,1,999999,100,200,500,5000\n",
        "templates/second.ptm":
          "Prime Recognition Document Template\n\n"
          + "Version 3.90\n"
          + "22,1\n"
          + "1,0,0,0,10,1,12,0,0,0\n"
          + "1\n"
          + "0,0,1,999999,100,200,500,5000\n"
      });
    });

    it("expects both output extensions", () => {
      expect(job.outputExtension("templates/first.ptm"))
        .to.equal("pdf");
      expect(job.outputExtension("templates/second.ptm"))
        .to.equal("xml");
    });
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

describe("PrimeJob with four images in different directories", () => {
  beforeEach(() => {
    job = PrimeJob("Prime Recognition Job File\n"
                   + "Version 3.90\n"
                   + "4\n"
                   + "o:\\first\\path\\00000001.tif\n"
                   + "o:\\templates\\first.ptm\n"
                   + "o:\\first\\path\\00000002.tif\n"
                   + "o:\\templates\\second.ptm\n"
                   + "o:\\second\\path\\00000003.tif\n"
                   + "o:\\templates\\first.ptm\n"
                   + "o:\\second\\path\\00000004.tif\n"
                   + "o:\\templates\\second.ptm\n");
  });

  it("finds both volume paths", () => {
    expect(job.volumePaths()).to.have.members([
      "first/path",
      "second/path"
    ]);
  });

  it("asks to view both template files", () => {
    expect(job.templatePaths()).to.have.members([
      "templates/first.ptm",
      "templates/second.ptm"
    ]);
  });

  describe("when given differing template file outputs", () => {
    beforeEach(() => {
      job.addTemplates({
        "templates/first.ptm":
          "Prime Recognition Document Template\n\n"
          + "Version 3.90\n"
          + "0,1\n"
          + "1,0,0,0,10,1,12,0,0,0\n"
          + "1\n"
          + "0,0,1,999999,100,200,500,5000\n",
        "templates/second.ptm":
          "Prime Recognition Document Template\n\n"
          + "Version 3.90\n"
          + "13,1\n"
          + "1,0,0,0,10,1,12,0,0,0\n"
          + "1\n"
          + "0,0,1,999999,100,200,500,5000\n"
      });
    });

    it("expects both output extensions", () => {
      expect(job.outputExtension("templates/first.ptm"))
        .to.equal("txt");
      expect(job.outputExtension("templates/second.ptm"))
        .to.equal("pdf");
    });

    describe("when told about only completed files", () => {
      beforeEach(() => {
        job.addFiles({
          "first/path": [
            "00000001.txt",
            "00000002.pdf",
            "confid.txt"
          ],
          "second/path": [
            "00000003.txt",
            "00000004.pdf",
            "confid.txt"
          ]
        });
      });

      it("asks to delete no files", () => {
        expect(job.filesToDelete()).to.deep.equal([]);
      });

      it("knows it's complete", () => {
        expect(job.isComplete()).to.equal(true);
      });
    });

    describe("when told that 00000001.tif still exists", () => {
      beforeEach(() => {
        job.addFiles({
          "first/path": [
            "00000001.tif",
            "00000001.txt",
            "00000002.pdf",
            "confid.txt"
          ],
          "second/path": [
            "00000003.txt",
            "00000004.pdf",
            "confid.txt"
          ]
        });
      });

      it("asks to delete 00000001.tif", () => {
        expect(job.filesToDelete()).to.have.members([
          "first/path/00000001.tif"
        ]);
      });

      it("knows it's complete", () => {
        expect(job.isComplete()).to.equal(true);
      });
    });

    describe("when told that only 00000001.tif is incomplete", () => {
      beforeEach(() => {
        job.addFiles({
          "first/path": [
            "00000001.tif",
            "00000002.pdf",
            "confid.txt"
          ],
          "second/path": [
            "00000003.txt",
            "00000004.pdf",
            "confid.txt"
          ]
        });
      });

      it("asks to delete no files", () => {
        expect(job.filesToDelete()).to.deep.equal([]);
      });

      it("knows it's incomplete", () => {
        expect(job.isComplete()).to.equal(false);
      });
    });

    describe("when told that only 00000002.tif is incomplete", () => {
      beforeEach(() => {
        job.addFiles({
          "first/path": [
            "00000001.txt",
            "00000002.tif",
            "confid.txt"
          ],
          "second/path": [
            "00000003.txt",
            "00000004.pdf",
            "confid.txt"
          ]
        });
      });

      it("asks to delete no files", () => {
        expect(job.filesToDelete()).to.deep.equal([]);
      });

      it("knows it's incomplete", () => {
        expect(job.isComplete()).to.equal(false);
      });
    });

    describe("when told it's complete but with blk files", () => {
      beforeEach(() => {
        job.addFiles({
          "first/path": [
            "00000001.txt",
            "00000001.blk",
            "00000002.pdf",
            "00000002.blk",
            "00000003.blk",
            "confid.txt"
          ],
          "second/path": [
            "00000003.txt",
            "00000003.blk",
            "00000004.pdf",
            "00000004.blk",
            "00000005.blk",
            "confid.txt"
          ]
        });
      });

      it("asks to delete relevant blk files", () => {
        expect(job.filesToDelete()).to.have.members([
          "first/path/00000001.blk",
          "first/path/00000002.blk",
          "second/path/00000003.blk",
          "second/path/00000004.blk"
        ]);
      });

      it("knows it's complete", () => {
        expect(job.isComplete()).to.equal(true);
      });
    });
  });
});

describe("PrimeJob looking for *.tif", () => {
  beforeEach(() => {
    job = PrimeJob("Prime Recognition Job File\n"
                   + "Version 3.90\n"
                   + "1\n"
                   + "o:\\vol\\*.tif\n"
                   + "o:\\templates\\txt.ptm\n");
  });

  it("knows to look in the right volume path", () => {
    expect(job.volumePaths()).to.have.members(["vol"]);
  });

  it("asks to view templates/txt.ptm", () => {
    expect(job.templatePaths()).to.have.members(["templates/txt.ptm"]);
  });

  describe("given a template file for txt output", () => {
    beforeEach(() => {
      job.addTemplates({
        "templates/txt.ptm":
          "Prime Recognition Document Template\n\n"
          + "Version 3.90\n"
          + "0,1\n"
          + "1,0,0,0,10,1,12,0,0,0\n"
          + "1\n"
          + "0,0,1,999999,100,200,500,5000\n"
      });
    });

    describe("when told that 00000001.tif exists", () => {
      beforeEach(() => {
        job.addFiles({
          "vol": [
            "00000001.tif"
          ]
        });
      });

      it("asks to delete no files", () => {
        expect(job.filesToDelete()).to.be.empty;
      });

      it("knows it's incomplete", () => {
        expect(job.isComplete()).to.equal(false);
      });
    });

    describe("when given complete files for 5 images", () => {
      beforeEach(() => {
        job.addFiles({
          "vol": [
            "00000001.txt",
            "00000002.txt",
            "00000003.tif",
            "00000003.txt",
            "00000004.blk",
            "00000004.txt",
            "00000005.txt",
            "00000006.blk",
            "confid.txt"
          ]
        });
      });

      it("asks to delete unneeded files", () => {
        expect(job.filesToDelete()).to.have.members([
          "vol/00000003.tif",
          "vol/00000004.blk"
        ]);
      });

      it("knows it's complete", () => {
        expect(job.isComplete()).to.equal(true);
      });
    });
  });
});

describe("PrimeJob looking for 00000003.tif then *.tif", () => {
  beforeEach(() => {
    job = PrimeJob("Prime Recognition Job File\n"
                   + "Version 3.90\n"
                   + "2\n"
                   + "o:\\vol\\00000003.tif\n"
                   + "o:\\templates\\pdf.ptm\n"
                   + "o:\\vol\\*.tif\n"
                   + "o:\\templates\\txt.ptm\n");
  });

  it("knows to look in the right volume path", () => {
    expect(job.volumePaths()).to.have.members(["vol"]);
  });

  it("asks to view both templates", () => {
    expect(job.templatePaths()).to.have.members([
      "templates/pdf.ptm",
      "templates/txt.ptm"
    ]);
  });

  it("given the templates", () => {
    beforeEach(() => {
      job.addTemplates({
        "templates/pdf.ptm":
          "Prime Recognition Document Template\n\n"
          + "Version 3.90\n"
          + "13,1\n"
          + "1,0,0,0,10,1,12,0,0,0\n"
          + "1\n"
          + "0,0,1,999999,100,200,500,5000\n",
        "templates/txt.ptm":
          "Prime Recognition Document Template\n\n"
          + "Version 3.90\n"
          + "0,1\n"
          + "1,0,0,0,10,1,12,0,0,0\n"
          + "1\n"
          + "0,0,1,999999,100,200,500,5000\n"
      });
    });

    describe("when told that four complete pages exist", () => {
      beforeEach(() => {
        job.addFiles({
          "vol": [
            "00000001.txt",
            "00000002.txt",
            "00000003.pdf",
            "00000004.txt",
            "confid.txt"
          ]
        });
      });

      it("asks to delete no files", () => {
        expect(job.filesToDelete()).to.be.empty;
      });

      it("knows it's complete", () => {
        expect(job.isComplete()).to.equal(true);
      });
    });
  });
});
