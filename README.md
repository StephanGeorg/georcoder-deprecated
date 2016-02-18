# Georcoder

A promises based geocoder for node.js


## Installation

Installing using npm (node package manager):

    npm i georcoder


## Usage ##

### Initialization ###
```javascript
var Georcoder = require('georcoder'),
    geocoder = new GeocoderArcGIS({
      client_id:      'YOUR CLIENT ID',
      client_secret:  'YOUR CLIENT SECRET'
    });
```

The constructor function also takes an optional configuration object:

### Geocode ###
```javascript
  geocoder.geocode('Berlin',{})
  .then(function(response){
    console.log(response);
  })
  .catch(function(error){
    console.log(error);
  });
```

Optional parameters:


### Reverse ###
```javascript
  geocoder.positionToWords({
    position: '51.484463,-0.195405'
  }).then(function(response) {

    console.log(response); //prom.cape.pump
  });
```

Optional parameters:


### Suggest ###
```javascript
geocoder.suggest('Glogauer Straße, Berlin',{})
    .then(function(response){
      console.log(response);
    })
    .catch(function(error){
      console.log(error);
    });
```

Optional parameters:



### Response ###

All the methods return a promise.

## License
