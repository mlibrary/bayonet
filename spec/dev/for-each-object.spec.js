// Copyright (c) 2018 The Regents of the University of Michigan.
// All Rights Reserved. Licensed according to the terms of the Revised
// BSD License. See LICENSE.txt for details.

/* eslint-env mocha */
/* eslint-disable no-unused-vars */
const expect = require("chai").expect;
const forEachIn = require("../../lib/for-each-object");

let pairs;
const logPairs = (a, b) => {
  pairs.push([a, b]);
};

describe("forEachIn()", () => {
  beforeEach(() => {
    pairs = [];
  });

  it("does nothing when passed an empty object", () => {
    forEachIn({}, logPairs);
    expect(pairs).to.deep.equal([]);
  });
});
