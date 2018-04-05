# promisify-bash
The library aims to execute commands in local terminal (/bin/bin on Mac cmd.exe on Window)  in promisifing ways.

#usage

```javascript
var bash = require('promisify-bash');

bash('git branch')
  .then(function(d){
    console.log(d);
  })
  .catch(function(e){
    console.log(e);
  })
```
# Good Library Companions
* [promisify-cli](https://www.npmjs.com/package/promisify-cli)
* [promisify-fetch](https://www.npmjs.com/package/promisify-fetch)
* [promisify-fs](https://www.npmjs.com/package/promisify-fs)
* [promsifiy-git](https://www.npmjs.com/package/promisify-git)
* [promsifiy-npm](https://www.npmjs.com/package/promisify-npm)
