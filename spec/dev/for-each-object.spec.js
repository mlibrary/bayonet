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

  it("does loops once through {a: b}", () => {
    forEachIn({"a": "b"}, logPairs);
    expect(pairs).to.deep.have.members([["b", "a"]]);
  });

  it("does loops once through {c: d}", () => {
    forEachIn({"c": "d"}, logPairs);
    expect(pairs).to.deep.have.members([["d", "c"]]);
  });

  it("does loops both times through {e: f, g: h}", () => {
    forEachIn({"e": "f", "g": "h"}, logPairs);
    expect(pairs).to.deep.have.members([["f", "e"], ["h", "g"]]);
  });

  describe("when an object has a prototype", () => {
    let prototypedObject;
    let loopObject;

    beforeEach(() => {
      prototypedObject = {"somethingWeird": "unexpected"};
      loopObject = Object.create(prototypedObject);
    });

    it("ignores the prototype", () => {
      forEachIn(loopObject, logPairs);
      expect(pairs).to.deep.equal([]);
    });
  });
});
