# jasmineJSONScreenshotReporter
Simple reporter to JSON with screenshots support. 
Doesn't support screenshots for forking instance, for that just add array of instances and make screenshotting for each of them.
Tested only with protractor.

# Usage 
In protractor:

```
const reporter = require('jasmineJSONScreenshotReporter');
exports.config = {  
  onPrepare: function(){
    jasmine.getEnv().addReporter(new reporter({}));
  }
}
```
