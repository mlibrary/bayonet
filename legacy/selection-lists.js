// Copyright (c) 2017 The Regents of the University of Michigan.
// All Rights Reserved. Licensed according to the terms of the Revised
// BSD License. See LICENSE.txt for details.

/* eslint-disable no-unused-vars */
const csv = require("csv");
const fs = require("fs");
const Lumberyard = require("lumberyard");
const FileTreeInspector = Lumberyard.FileTreeInspector();

let tsv = filePath => new Promise((resolve, reject) => {
  fs.readFile(filePath, (error, data) => {
    if (error)
      reject(error);

    else
      csv.parse(data, {"delimiter": "\t"}, (error, output) => {
        if (error)
          reject(error);

        else
          resolve(output);
      });
  });
});

let isBlankLine = line => {
  for (let cell of line)
    if (cell !== "")
      return false;

  return true;
};

let institutions = new Map();

institutions.set("u-m", new Set([
  "EYM",
  "BEU",
  "E8W",
  "EER",
  "EKL",
  "EMI",
  "EUQ",
  "EYD",
  "HJ8",
  "U2T",
  "UMSPO",
  "UMDON"
]));

institutions.set("hathi", new Set([
  "HATHI"
]));

institutions.set("cic", new Set([
  // University of Chicago
  "CGU",
  "IAB",
  "KEH",

  // University of Illinois
  "UIU",
  "ILG",
  "IAL",
  "LSI",
  "RHU",
  "RQF",
  "RQR",

  // Indiana University
  "AAAMC",
  "FSIUL",
  "I3U",
  "IJZ",
  "IUB",
  "IUG",
  "IUL",
  "IULGB",
  "IULSP",
  "RQQ",
  "XUL",
  "XYA",

  // University of Iowa
  "NUI",
  "LUI",
  "UIL",
  "UKO",

  // Michigan State University
  "EEM",
  "EVK",
  "MIMSU",
  "MSUTA",
  "MSUTP",

  // University of Minnesota
  "MNU",
  "DIF",
  "HOR",
  "MCR",
  "MLL",
  "MND",
  "MNH",
  "MNU",
  "MNUDS",
  "MNX",
  "MNY",
  "NRI",
  "UMM",
  "UMMBL",
  "XOR",

  // Northwestern University
  "INU",
  "FSINU",
  "INL",
  "INM",
  "INUQR",
  "JCR",
  "TSINU",
  "YO5",

  // Ohio State University
  "OSU",
  "OHL",
  "OS0",
  "OS1",
  "OS6",
  "ZH5",
  "ZH6",

  // Pennsylvania State University
  "UPM",
  "UPC",

  // Purdue University
  "IPL",
  "IPC",
  "IPN",
  "IUP",
  "HV6",

  // University of Wisconsin - Madison
  "GZI"
]));

console.log(FileTreeInspector);

module.exports = async function(pwd) {
  let processLists = async function(root) {
    let lists = await FileTreeInspector.getSizesUnder(pwd);

    for (let listFilename of lists)
      root.add(async function(list) {
        let data = await tsv(listFilename);

        if (data.length === 0)
          throw Error(listFilename + " is empty");

        let rowStart = 0;

        if (/^[0-9]{14}$/.test(data[0][0])
            || /^[Bb][0-9]+$/.test(data[0][0])) {
          list.header = [];
          for (let i = 0; i < data[0].length; i += 1)
            list.header.push("");
        } else {
          rowStart = 1;
          list.header = data[0];
        }

        let match = listFilename.match(/([Dd][CcXxYyZz])[^/]*$/);

        if (match === null)
          list.defaultStatus = null;

        else
          list.defaultStatus = match[1].toUpperCase();

        for (let i = rowStart; i < data.length; i += 1)
          if (!isBlankLine(list[i]))
            list.add(async function(line) {
              line.cells = list[i];

              let last = line.cells[line.cells.length - 1];
              if (/^[Dd][CcXxYyZz]$/.test(last))
                line.status = last.toUpperCase();

              else if (list.defaultStatus === null)
                throw Error(
                  listFilename + " " + (i + 1).toString() + " invalid status");

              else
                line.status = list.defaultStatus;
            });
      });
  };
};
