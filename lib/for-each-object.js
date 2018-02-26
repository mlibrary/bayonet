// Copyright (c) 2018 The Regents of the University of Michigan.
// All Rights Reserved. Licensed according to the terms of the Revised
// BSD License. See LICENSE.txt for details.

module.exports = function(loopObject, loopBody) {
  for (const key in loopObject)
    loopBody(loopObject[key], key);
};
