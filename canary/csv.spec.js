// Copyright (c) 2017 The Regents of the University of Michigan.
// All Rights Reserved. Licensed according to the terms of the Revised
// BSD License. See LICENSE.txt for details.

/* eslint-env mocha */
const expect = require("chai").expect;
const csv = require("csv");

let data;

let parsePromise = input => new Promise((resolve, reject) => {
  csv.parse(input, {"delimiter": "\t"}, (error, output) => {
    if (error)
      reject(error);

    else
      resolve(output);
  });
});

describe("require('csv')", () => {
  describe("when parsing 'a\\tb\\n\\c\\td\\n'", () => {
    beforeEach(() => {
      return parsePromise("a\tb\nc\td\n").then(output => {
        data = output;
      });
    });

    it("outputs [['a', 'b'], ['c', 'd']]", () => {
      expect(data).to.deep.equal([["a", "b"], ["c", "d"]]);
    });
  });

  describe("when parsing 'a\\tb\\nc\\n", () => {
    it("raises an error", () => {
      return parsePromise("a\tb\nc\n").catch(error => {
        expect(error).to.be.an.instanceof(Error);
      });
    });
  });
});
