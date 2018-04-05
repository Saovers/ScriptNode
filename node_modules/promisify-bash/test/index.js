var bash = require('../index.js');

bash('ls .')
  .then(function (d) {
    console.log('-->', d);
  })
  .catch(function (e) {
    console.log(e);
  })

