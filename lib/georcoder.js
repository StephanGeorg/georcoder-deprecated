var request = require('request'),
          _ = require('lodash');


/**
 * NodeJS wrapper for the ESRI ArcGIS geocoder
 *
 * @param options Add client_id, client_secret to get token from ArcGIS auth
 * @return Instance of {@link GeocoderArcGIS}
 */
function Georcoder (options) {

  this.options  = options || {};

  this.provider = [];
  this.extend = [];

  this.now = 0;
  this.init();

}

module.exports = Georcoder;


Georcoder.prototype.init = function () {
  var providers = [], extenders = [];

  // initialize all providers
  _.each(this.options.provider, function(provider){
    try{
      var prv = require(provider.type);
      providers.push(new prv(provider.params));
    } catch(err){
      console.log(err);
    }
  });
  this.provider = providers;

  // initialize all extenders
  _.each(this.options.extend, function(extend){
    try{
      var ex = require(extend.type);
      extenders[extend.type] = new ex(extend.params);
    } catch(err){
      console.log(err);
    }
  });

  this.extend = extenders;

};


/**
 *
 */
Georcoder.prototype.geocode = function (data,params) {

  var actions = [];

  if(this.provider.length){
    return this.chaining('geocode',data,params)
      .then(_.bind(function(geocodes){
        _.each(geocodes,_.bind(function(geo){
          var data = geo.data.geometry.coordinates.join();
          actions.push(this.extending('reverse',data,params));
        },this));

        return Promise.all(actions)
          .then(_.bind(function(response){
            var result = [];
            _.each(geocodes,_.bind(function(geo,k){
              result.push(this.parse([[geo],response[k]]));
            },this));
            return result;
          },this))
          .catch(_.bind(function(error){
            return this.returnError(error);
        },this));
        
      },this));
  }




};

/**
 *
 */
Georcoder.prototype.reverse = function (data,params) {

  var actions = [];

  if(this.provider.length){
    actions.push(this.chaining('reverse',data,params));
  }
  actions.push(this.extending('reverse',data,params));

  return new Promise(_.bind(function(resolve,reject){

    Promise.all(actions)
      .then(_.bind(function(response){
        resolve(this.parse(response,data));
      },this))
      .catch(_.bind(function(error){
        reject(this.returnError(error));
      },this));

  },this));

};



Georcoder.prototype.chaining = function (method,data,params) {
  var geocoders = [];
  this.now = 0;

  return new Promise(_.bind(function(resolve,reject){

    this.get(method,this.provider[this.now++],data,params)
      .then(_.bind(function(response){

        if(this.checkResponse(response,method)){
          resolve(this.formatter('arcgis',method,response,{data: data, params: params}));
        } else {
          if(this.now < this.provider.length) {
            reject(this.returnEmpty());
          }
          reject(this.returnEmpty());
        }
      },this))
      .catch(_.bind(function(error){
        reject(error);
      },this));
  },this));
};

Georcoder.prototype.extending = function (method,data,params) {
  var extenders = [];

  _.forOwn(this.extend,_.bind(function(extend){
    extenders.push(this.get('reverse',extend,data,params));
  },this));

  return new Promise(function(resolve,reject){
    Promise.all(extenders)
      .then(function(response){
        resolve(response);
      })
      .catch(function(error){
        reject(error);
      });
  });


};



Georcoder.prototype.checkResponse = function (response,method) {

  if(response.error) {
    return;
  }

  if(method === 'geocode'){
    if(response.locations.length) {
      return true;
    }
  }

  if(method === 'reverse') {
    if(response.address) {
      return true;
    }
  }

  return;
};



Georcoder.prototype.get = function (method,provider,data,params) {

  if(method === 'reverse') {
    if(typeof provider.getRegions === 'function') {
      var coords = data.split(',');
      return new Promise(_.bind(function(resolve,reject){
        provider.getRegions({
          lat: Number(coords[1]),
          lng: Number(coords[0])
        },params).then(_.bind(function(response){
          resolve({
            source: 'osm',
            type: 'extend',
            data: {
              rpath: this.formatOsm(response)
            }
          });
        },this)).
        catch(function(error){
          reject(error);
        });
      },this));
    } else if(typeof provider.positionToWords === 'function') {
      return new Promise(_.bind(function(resolve,reject){
        provider.positionToWords({position: this.switch2LngLat(data)},params)
          .then(function(response){
            resolve({
              source: 'w3w',
              type: 'extend',
              data: {
                w3w: response
              }
            });
          })
          .catch(function(error){
            reject(error);
          });
      },this));
    } else {
      return provider.reverse(data,params);
    }
  }

  if(method === 'geocode') {
    return provider.geocode(data,params);
  }


};



/**
 *
 */
Georcoder.prototype.suggest = function (data,params) {


};


Georcoder.prototype.parse = function (responses,request) {
  var extend = [],
      geo = [];

  _.each(responses,function(response){
    _.each(response,function(data){
      if(data.type === 'chain') {
        geo.push(data.data);
      } else if(data.type === 'extend'){
          extend.push(data.data);
        }
    });
  });

  if(!geo.length){
    geo.push(this.geojson(request));
  }

  _.each(geo,function(location){
    _.each(extend,function(data){
      _.extend(location.properties,data);
    });
  });



  return geo;


};

Georcoder.prototype.geojson = function (data,properties) {
  var coords = data.split(',');
  properties = properties || {};

  return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [
          coords[0],  //  longitude
          coords[1]   //  latitude
        ]
      },
      properties: properties
  };
};


Georcoder.prototype.formatter = function (provider,method,response,request) {
  switch(provider){
    case 'arcgis' : return this.formatArcgis(method,response,request);
    case 'w3w'    : return this.formatW3w(method,response,request);
    case 'osm'    : return this.formatOsm(method,response,request);
  }
};

Georcoder.prototype.formatArcgis = function (method,response,request) {
  if(method === 'reverse') {

    var coords = request.data.split(','),
        address = response.address;

    return [{
      source: 'arcgis',
      type: 'chain',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [
            coords[0],  //  longitude
            coords[1]   //  latitude
          ]
        },
        properties: {
          address: address.Address,     // Streetname + Street number
          postal: address.Postal,
          city: address.City,
          formatted_name: address.Match_addr
        }
      }
    }];

  }
  if(method === 'geocode') {
    var result = [],
        locations = response.locations;

    _.each(locations,function(location){

      var geocode = location.feature;

      result.push ({
        source: 'arcgis',
        type: 'chain',
        data: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [
            geocode.geometry.x,  //  longitude
            geocode.geometry.y]  //  latitude
        },
        properties: {
          address: geocode.attributes.StAddr,
          postal: geocode.attributes.Postal,
          city: geocode.attributes.City,
          formatted_name: geocode.attributes.Match_addr,
          // additional
          street: geocode.attributes.StName + ' ' + geocode.attributes.StType,
          house_number: geocode.attributes.AddNum,
          side: geocode.attributes.Side,
        }
      }
      });
    });

    return result;
  }
};

Georcoder.prototype.formatOsm = function (response) {
  var result = [];
  _.each(response,function(rpath){
    result.push(Number(rpath.osm_id));
  });
  return result;
};




/**
 *  Responses
 */
Georcoder.prototype.returnEmpty = function () {
  return {
    code: 404,
    msg: 'Not found'
  };
};

Georcoder.prototype.returnWrongInput = function (msg) {

  return {
    code: 400,
    msg: 'Bad Request: ' + msg
  };
};

Georcoder.prototype.returnError = function (msg) {

  var error = {};

  if(typeof msg === 'object') {
    error = {
      code: msg.code || '',
      msg: msg.msg || '',
    };
  } else if(typeof msg === 'string') {
    error = {
      code: 0,
      msg: msg,
    };
  }


  return {
    code: 500,
    msg: 'Internal Server Error: ' + error.msg + ' (' + error.code + ')'
  };
};

/**
 *  Validations
 */
Georcoder.prototype.validateLngLat = function (lnglat) {
  var coordinates = lnglat.split(',');
  if(coordinates.length === 2) {
    var lat = Number(coordinates[1]),
        lng = Number(coordinates[0]);
    if((lng > -180 && lng < 180) && (lat > -90 && lat < 90)) {
      return true;
    }
  }
  return;
};
/**
 *  Validations
 */
Georcoder.prototype.switch2LngLat = function (latlng) {
  var coordinates = latlng.split(',');
  if(coordinates.length === 2) {
    return [coordinates[1],coordinates[0]].join();
  }
  return;
};
