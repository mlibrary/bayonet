// Copyright (c) 2017 The Regents of the University of Michigan.
// All Rights Reserved. Licensed according to the terms of the Revised
// BSD License. See LICENSE.txt for details.

/* eslint-disable no-unused-vars */
const csv = require("csv");
const distance = require("fast-levenshtein").get;
const exec = require("executive");
const fs = require("fs");
const http = require("http");
const querystring = require("querystring");
const { URL } = require("url");
const parseXML = require("xml2js").parseString;

const Lumberyard = require("lumberyard");
const FileTreeInspector = Lumberyard.FileTreeInspector();

const TreeError = function(message) {
  const error = Error(message);

  error.toJSON = function() {
    return message;
  };

  return error;
};

const tsv = filePath => new Promise((resolve, reject) => {
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

const isBlankRow = row => {
  for (const cell of row)
    if (cell !== "")
      return false;

  return true;
};

const curl = (url, data) => new Promise(function(resolve, reject) {
  const options = new URL(url + "?" + querystring.stringify(data || {}));
  let result = "";

  const request = http.request(options, response => {
    response.setEncoding("utf8");

    response.on("data", chunk => {
      result += chunk;
    });

    response.on("end", () => {
      resolve(result);
    });

    response.on("err", error => {
      console.log(error);
      console.log("RESPONSE ERR");
      reject(error);
    });
  });

  request.on("err", error => {
    console.log(error);
    console.log("REQUEST ERR");
    reject(error);
  });

  request.end();
});

const curlXML = (url, data) => new Promise(function(resolve, reject) {
  curl(url, data).then(xml => {
    parseXML(xml, (error, value) => {
      if (error)
        reject(error);

      else
        resolve(value);
    });
  }, reject);
});

const alephURL = async function(barcode) {
  const internal = {
    "id": barcode,
    "type": "bc",
    "schema": "marcxml"
  };

  const mdp = {
    "id": "mdp." + barcode,
    "schema": "marcxml"
  };

  let data = await curlXML(
    "http://mirlyn-aleph.lib.umich.edu/cgi-bin/bc2meta", internal);

  if (data.error)
    data = await curlXML(
      "http://mirlyn-aleph.lib.umich.edu/cgi-bin/bc2meta", mdp);

  if (data.error)
    throw TreeError(data.error);

  return data;
};

const worldcatURL = async function(oclc) {
  const data = await curl(
    "http://www.worldcat.org/webservices/catalog/content/libraries/" + oclc, {
      "wskey": process.env.MDP_REJECT_WC_KEY,
      "format": "json",
      "maximumLibraries": "50"
    }
  );

  return JSON.parse(data);
};

const hathiOCLC = async function(oclc) {
  const data = await curl(
    "http://catalog.hathitrust.org/api/volumes/brief/oclc/"
    + oclc + ".json");

  return JSON.parse(data);
};

const hathiBIB = async function(bib) {
  const data = await curl(
    "http://catalog.hathitrust.org/api/volumes/brief/recordnumber/"
    + bib + ".json");

  return JSON.parse(data);
};

const getMarcData = async function(barcode) {
  const marc = await alephURL(barcode);
  const result = {};

  result.control = new Map();
  for (const controlfield of marc.record.controlfield)
    result.control.set(controlfield["$"].tag, controlfield["_"]);

  const rawData = new Map();
  for (const datafield of marc.record.datafield) {
    const attrs = datafield["$"];
    if (!rawData.has(attrs.tag))
      rawData.set(attrs.tag, new Map());

    const a = rawData.get(attrs.tag);
    for (const subfield of datafield.subfield) {
      if (!a.has(subfield["$"].code))
        a.set(subfield["$"].code, []);

      a.get(subfield["$"].code).push(subfield["_"]);
    }
  }

  result.data = function(a, b) {
    if (!rawData.has(a))
      return [];

    if (!rawData.get(a).has(b))
      return [];

    return rawData.get(a).get(b);
  };

  result.first = function(a, b) {
    const all = result.data(a, b);
    if (all.length === 0)
      return undefined;

    else
      return all[0];
  };

  return result;
};

const appendFile = (file, data) => new Promise((resolve, reject) => {
  fs.appendFile(file, data, error => {
    if (error)
      reject(error);
    else
      resolve();
  });
});

const normalizedDistance = (a, b) =>
  distance(a, b) / Math.max(a.length, b.length);

const soften = s => s.toLowerCase().replace(/[^0-9a-z ]/g, "");

const institutions = new Map();

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
  try {
    const marc = await getMarcData(barcode);
    const aleph = {};

    aleph.bib = marc.control.get("001");
    aleph.title = marc.first("245", "a");
    aleph.callno = marc.first("MDP", "h");
    aleph.description = marc.first("MDP", "z");

    if (marc.first("100", "a"))
      aleph.author = marc.first("100", "a");

    else if (marc.first("110", "a") && marc.first("110", "b"))
      aleph.author = marc.first("110", "a") + " " + marc.first("110", "b");

    else if (marc.first("110", "a"))
      aleph.author = marc.first("110", "a");

    else if (marc.first("110", "b"))
      aleph.author = marc.first("110", "b");

    else if (marc.first("111", "a"))
      aleph.author = marc.first("111", "a");

    else if (marc.first("130", "a"))
      aleph.author = marc.first("130", "a");

    for (const x of marc.data("035", "a")) {
      const match = x.match(/^\(OCoLC\).*?([0-9]+)$/);

      if (match) {
        aleph.oclc = match[1];
        while (aleph.oclc.length < 9)
          aleph.oclc = "0" + aleph.oclc;

        break;
      }
    }

    if (marc.control.has("008")) {
      const yearString = marc.control.get("008");
      aleph.years = [yearString.slice(7, 11), yearString.slice(11, 15)];
    }

    let numcic = 0;
    let numoth = 0;
    let numum = 0;
    let dumb = 0;
    let hathiMDP = 0;
    let hathiOther = 0;
    let titleDistance = 1;
    const softTitle = soften(aleph.title || "");

    if (aleph.oclc) {
      let worldcat, hathiCount;

      try {
        const raw = await worldcatURL(aleph.oclc);
        worldcat = {"title": raw.title, "libraries": []};
        for (const library of raw.library)
          worldcat.libraries.push(library.oclcSymbol);

        for (const library of worldcat.libraries)
          if (institutions.get("hathi").has(library))
            dumb += 1;
          else if (institutions.get("u-m").has(library))
            numum += 1;
          else if (institutions.get("cic").has(library))
            numcic += 1;
          else
            numoth += 1;
      } catch (error) {
        worldcat = null;
      }

      try {
        hathiCount = await hathiOCLC(aleph.oclc);
        for (const item of hathiCount.items)
          if (item.htid.match(/^mdp\./))
            hathiMDP += 1;
          else
            hathiOther += 1;
      } catch (error) {
        hathiCount = null;
      }
    }

    if (aleph.bib)
      try {
        const raw = await hathiBIB(aleph.bib);
        for (const record in raw.records)
          for (const title of raw.records[record].titles)
            titleDistance = Math.min(
              titleDistance, normalizedDistance(softTitle,
                                                soften(title)));
      } catch (error) { }

    const row = [];
    row.push(aleph.bib || "");
    row.push(aleph.oclc || "");
    row.push(aleph.callno || "");
    row.push(aleph.author || "");
    row.push(aleph.title || "");
    row.push(aleph.desc || "");

    if (aleph.years)
      for (const year of aleph.years)
        row.push(year.replace("^^^^", ""));

    let isUnique;

    if (numcic > 0)
      isUnique = numcic + numoth < 3;
    else
      isUnique = numcic + numoth < 5;

    row.push(isUnique ? "unique" : "");
    row.push(numcic.toString());
    row.push(numoth.toString());
    row.push(numum.toString());
    row.push(dumb.toString());
    row.push(hathiMDP.toString());
    row.push(hathiOther.toString());
    row.push((Math.round(1000 * (1 - titleDistance)) / 10).toString());

    return row;
  } catch (error) {
    return null;
  }
};

module.exports = function(logDir, alephDropbox, successDir) {
  return async function(pwd) {
    // we'll need a full list of barcodes in the end
    const barcodeFilename = alephDropbox
      + Lumberyard.tempName("/barcodes-YYYYmmdd.txt");

    const processLists = async function(root) {
      root.description = "processing selection lists in " + pwd;

      // i'll assume that every file is a selection list
      const lists = await FileTreeInspector.getSizesUnder(pwd);

      root.all = "";

      root.runAfter = async function() {
        if (root.all.length > 0)
          await appendFile(barcodeFilename, root.all);
      };

      for (const listFilename of lists.keys())
        root.add(async function(list) {
          list.description = listFilename;

          // i expect every selection list to be a tab-separated file
          const data = await tsv(listFilename);

          if (data.length === 0)
            // i'm not ok with empty files
            throw TreeError(listFilename + " is empty");

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
          const match = listFilename.match(/([Dd][CcXxYyZz])[^/]*$/);

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
            for (const row of list.outputRows)
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
            if (!isBlankRow(data[i]))
              // we'll look at every nonblank row
              list.add(async function(row) {
                row.cells = data[i];
                row.barcode = row.cells[0];
                row.description = row.barcode;

                // the last cell should be the status
                const last = row.cells[row.cells.length - 1];
                if (/^[Dd][CcXxYyZz]$/.test(last))
                  // awesome, the last cell is the status
                  row.status = last.toUpperCase();

                else if (list.defaultStatus === null)
                  // the last cell isn't the status and we have no default
                  throw TreeError(listFilename
                    + " " + (i + 1).toString()
                    + " invalid status");

                else
                  // the last cell isn't the status but we have a default
                  row.status = list.defaultStatus;

                row.run = async function() {
                  const cols = await lookUpBarcode(row.barcode);
                  if (cols !== null) {
                    list.outputRows.push(row.cells.concat(cols));
                    root.all += row.barcode + "\t" + row.status + "\n";
                  }
                };
              });
        });
    };

    const logFile = Lumberyard.tempName(
      logDir + "/selection-list-YYYYmmdd-HHMMSS.log");

    try {
      await Lumberyard.ProcessTree(logFile, processLists);
    } catch (error) {
      await appendFile(logDir + "/error.log", logFile + "\n");
      throw error;
    }

    await exec("mv -i '" + pwd + "'/* '" + successDir + "'");
    await exec("rmdir '" + pwd + "'");
  };
};
