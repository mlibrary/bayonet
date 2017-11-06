// Copyright (c) 2017 The Regents of the University of Michigan.
// All Rights Reserved. Licensed according to the terms of the Revised
// BSD License. See LICENSE.txt for details.

/* eslint-disable no-unused-vars */
const csv = require("csv");
const exec = require("executive");
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

let isBlankRow = row => {
  for (let cell of row)
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

const lookUpBarcode = async function(barcode) {
  return null;
};

module.exports = async function(pwd) {
  // we'll need a full list of barcodes in the end
  let barcodeFilename = Lumberyard.tempName("barcodes-YYYYmmdd.txt");
  let fullList = pwd + "/" + barcodeFilename;

  let processLists = async function(root) {
    root.description = "mdp selection lists in " + pwd;

    // i'll assume that every file is a selection list
    let lists = await FileTreeInspector.getSizesUnder(pwd);

    if (lists.has(fullList))
      throw Error(fullList + " no don't call anything this, no please");

    root.all = "";

    root.runAfter = () => new Promise(function(resolve, reject) {
      // on success, write to the full list file
      if (root.all.length > 0)
        fs.appendFile(fullList, root.all, error => {
          if (error)
            reject(error);

          else
            resolve();
        });
    });

    for (let listFilename of lists.keys())
      root.add(async function(list) {
        list.description = listFilename;

        // i expect every selection list to be a tab-separated file
        let data = await tsv(listFilename);

        if (data.length === 0)
          // i'm not ok with empty files
          throw Error(listFilename + " is empty");

        // if there's no header row, then the first data row is the
        // first row
        let rowStart = 0;

        if (/^[0-9]{14}$/.test(data[0][0])
            || /^[Bb][0-9]+$/.test(data[0][0])) {
          // if the first cell is a valid barcode identifier, then there
          // is no header, so we'll create a blank row to represent the
          // header
          list.header = [];
          for (let i = 0; i < data[0].length; i += 1)
            list.header.push("");
        } else {
          // if we have a header, then we'll skip it as a data row but
          // also add it as our list header
          rowStart = 1;
          list.header = data[0];
        }

        // look for DC|DX|DY|DZ in the filename
        let match = listFilename.match(/([Dd][CcXxYyZz])[^/]*$/);

        if (match === null)
          // we didn't find anything ergo no default
          list.defaultStatus = null;

        else
          // we found a default mirlyn status
          list.defaultStatus = match[1].toUpperCase();

        list.outputRows = [];

        list.runAfter = () => new Promise(function(resolve, reject) {
          // fill in the header with the new columns
          list.header.push("bib");
          list.header.push("oclc");
          list.header.push("callno");
          list.header.push("author");
          list.header.push("title");
          list.header.push("desc");
          list.header.push("pubdate");
          list.header.push("");
          list.header.push("unique");
          list.header.push("cic");
          list.header.push("noncic");
          list.header.push("uofm");
          list.header.push("whocares");
          list.header.push("hathitrust_mdp");
          list.header.push("hathitrust_other");
          list.header.push("title_match_percent");

          // convert rows into tab-delimited text
          let text = list.header.join("\t") + "\r\n";
          for (let row of list.outputRows)
            text += row.join("\t") + "\r\n";

          // overwrite the input file
          fs.writeFile(listFilename, text, error => {
            if (error)
              reject(error);

            else
              resolve();
          });
        });

        for (let i = rowStart; i < data.length; i += 1)
          if (!isBlankRow(list[i]))
            // we'll look at every nonblank row
            list.add(async function(row) {
              row.cells = list[i];
              row.barcode = row.cells[0];
              row.description = row.barcode;

              // the last cell should be the status
              let last = row.cells[row.cells.length - 1];
              if (/^[Dd][CcXxYyZz]$/.test(last))
                // awesome, the last cell is the status
                row.status = last.toUpperCase();

              else if (list.defaultStatus === null)
                // the last cell isn't the status and we have no default
                throw Error(listFilename
                            + " " + (i + 1).toString()
                            + " invalid status");

              else
                // the last cell isn't the status but we have a default
                row.status = list.defaultStatus;

              row.run = async function() {
                let cols = await lookUpBarcode(row.barcode);
                if (cols !== null) {
                  list.outputRows.push(row.cells.concat(cols));
                  root.all += row.barcode + "\t" + row.status + "\n";
                }
              };
            });
      });
  };

  let logfile = Lumberyard.tempName(
    "/ram/selection-list-YYYYmmdd-HHMMSS.log");

  try {
    await Lumberyard.ProcessTree(logfile, processLists);
  } catch (error) {
    await exec("echo '" + logfile + "' >> /ram/error.log");
    throw error;
  }

  let aleph = "/quod-prep/prep/d/dcu/DCU_Barcode_lists/2_Txt_sent_to_MDP-rejects/Aleph_Dropbox/" + barcodeFilename;

  await exec("cat '" + fullList + "' >> '" + aleph + "'");
  await exec("rm '" + fullList + "'");
  await exec("mv -it '/quod-prep/prep/d/dcu/DCU_Barcode_lists/3_Finished_Import-Pick_lists' '" + pwd + "'/*");
  await exec("rmdir '" + pwd + "'");
};

console.log("selection-lists loads ok");
