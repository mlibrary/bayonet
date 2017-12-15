// Copyright (c) 2017 The Regents of the University of Michigan.
// All Rights Reserved. Licensed according to the terms of the Revised
// BSD License. See LICENSE.txt for details.

/* eslint-env mocha */
const expect = require("chai").expect;
const distance = require("fast-levenshtein").get;

describe("fast-levenshtein.run", function() {
  for (const triple of [
    ["book", "back", 2],
    ["Matt", "matt", 1],
    ["hey doggie", "hey doggie", 0],
    ["The Magna Carta", "just some txt file", 17]
  ])
    it("measures '" + triple[0]
      + "' and '" + triple[1]
      + "' at " + triple[2], function() {
      expect(distance(triple[0], triple[1])).to.equal(triple[2]);
    });
});
