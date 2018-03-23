'use strict';
const promisify = require('util').promisify;
const fs = require('fs');
const writeFile = promisify(fs.writeFile);
const path = require('path');
const DEFAULT_DESTINATION = 'e2eReport';
const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);

function replaceInvalidSymbols(path) {
    //replace symbols that forbidden as Windows folder name
    return path.replace(/[\s\\/:*?"<>|.]/g, '_');
}

async function myMkdir(directoriesPath) {
    //make directory path, if parent directories exists yet
    const arrayOfDirectories = directoriesPath.split(path.sep);

    for (let i=1; i<=arrayOfDirectories.length; i++){
        let iterationArray = arrayOfDirectories.slice(0, i);
        let newPath = iterationArray.join(path.sep);
        try {
            await mkdir(newPath);
        } catch (error){
            if (error.code === 'EEXIST'){
                const stats = await stat(newPath);
                if (!stats.isDirectory()) {
                    throw new Error(error);
                }
            } else {
                throw new Error(error);
            }
        }
    }
}

function jasmineJSONScreenshotReporter(opts){
    let runningSuite = null;
    let allSuites = [];
    let allSpecs = [];

    opts.dest     = opts.dest || DEFAULT_DESTINATION;
    opts.filename = opts.filename || 'report.html';
    opts.captureOnlyFailedSpecs = opts.captureOnlyFailedSpecs || true;
    opts.browserCaps = {};
    opts.cleanDestination = opts.hasOwnProperty('cleanDestination') ? opts.cleanDestination : true;

    function getSuiteClone(suite) {
        for (let localSuite of allSuites){
            if (localSuite.id === suite.id){
                Object.assign(localSuite, suite);
                return localSuite;
            }
        }
        let currentSuiteClone = {...suite};
        allSuites.push(currentSuiteClone);
        return currentSuiteClone;
    }

    function getSpecClone(spec) {
        for (let localSpec of allSpecs){
            if (localSpec.id === spec.id){
                Object.assign(localSpec, spec);
                return localSpec;
            }
        }
        let currentSpecClone = {...spec};
        allSpecs.push(currentSpecClone);
        return currentSpecClone;
    }

    function skipScreenShotting(spec) {
        if (spec.status === 'pending' || spec.status === 'disabled'){
            return true;
        }

        return !(!opts.captureOnlyFailedSpecs || spec.status === 'failed');
    }

    this.suiteStarted = async function(suite) {
        try {
            suite = getSuiteClone(suite);
            suite.specs = [];
            suite.utcStarted = new Date();
            runningSuite = suite;
        } catch (e){
            console.error(e);
        }
    };

    this.specStarted = function(spec) {
        try {
            spec = getSpecClone(spec);
            spec.utcStarted = new Date();
            spec.suite = runningSuite.description;
            runningSuite.specs.push(spec);
        } catch (e){
            console.error(e);
        }
    };

    this.specDone = async function(spec) {
        try {
            spec = getSpecClone(spec);
            spec.utcFinished = new Date();
            spec.duration = (spec.utcFinished - spec.utcStarted)/1000;

            const capabilities =  await browser.getCapabilities();
            spec.browserVersion = capabilities.get('version');
            spec.platform = capabilities.get('platform');
            spec.browserName = capabilities.get('browserName');
            spec.suiteDirectory = path.join(replaceInvalidSymbols(spec.suite), replaceInvalidSymbols(spec.browserName));
            spec.suiteFile = replaceInvalidSymbols(spec.description) + '.json';

            await myMkdir(path.join(DEFAULT_DESTINATION, spec.suiteDirectory));
            await writeFile(path.join(DEFAULT_DESTINATION, spec.suiteDirectory, spec.suiteFile), JSON.stringify(spec, null, 2) , 'utf-8');


            if (skipScreenShotting(spec)){
                //if xit or fit and if not failed (plus flag not set to screenshot always) then not screenshoting
                spec.skipPrinting = true;
                return;
            }

            const screenShot = await browser.takeScreenshot();
            spec.screenFile = replaceInvalidSymbols(spec.description) + '.png';
            const screenShotPath = path.join(DEFAULT_DESTINATION, spec.suiteDirectory, spec.screenFile);
            // should we optimize screenshoting by async writing?
            await writeFile(screenShotPath, screenShot, 'base64');
        } catch (e){
            console.error(e);
        }
    };

    this.suiteDone = function(suite) {
        try {
            suite = getSuiteClone(suite);
            suite.utcFinished = new Date();
            suite.duration = (suite.utcFinished - suite.utcStarted)/1000;
            runningSuite = null;
        } catch (e){
            console.error(e);
        }
    };
    return this;
}

module.exports = jasmineJSONScreenshotReporter;
