"use strict";

const _ = require('lodash');

// Provider
const W3w = require('w3w-node-wrapper');
const OSMRegions = require('osm-regions');
const GeocoderArcGIS = require('geocoder-arcgis');


module.exports = class Georcoder  {

  constructor (options) {

    const defaultOptions = {
      w3w: {},
      arcgis: {},
      osm: {}
    };

    this.options = options || defaultOptions;

    this.w3w = new W3w(this.options.w3w);
    this.osm = new OSMRegions(this.options.osm);
    this.arcgis = new GeocoderArcGIS(this.options.osm);

  }

  /**
    *   input  [lon, lat]
    */
  reverse (data, params) {

    return new Promise((resolve,reject) => {

      this.extending(data,params)
        .then(ext => {

          let result = this.generateGeoJson(data);
          result.properties = ext;

          this.arcgis.reverse(this.formatInput(data, { provider: 'arcgis', method: 'reverse' }), {maxLocations: 1})
            .then(response => {
              if(!response.error) {
                let reverse = this.formatOutput(response, { provider: 'arcgis', method: 'reverse' });
                if(reverse.properties) {
                  result.properties = _.merge(result.properties, reverse.properties);
                }
              }
              resolve(result);
            })
            .catch(error => {
              resolve(result);
            });

        })
        .catch(error => {
          reject(error);
        });


    });



  }

  geocode (data, params) {

    return new Promise((resolve,reject) => {
      let request = this.formatInput(data, {provider: 'arcgis', method: 'geocode' } );

      this.arcgis.geocode(request, {maxLocations: 1})
        .then(response => {

          let result = this.formatOutput(response, {provider: 'arcgis', method: 'geocode'});

          if(!result) {
            reject({code: 400, msg: `Address ${response} could not be geocoded!`});
            return;
          }

          let coordinates = result.geometry.coordinates;

          this.extending(coordinates, params)
            .then(ext => {
              result.properties = _.merge(result.properties, ext);
              resolve(result);
            })
            .catch(err => {
              reject(err);
            });

        })
        .catch(error => {
          reject(error);
        });

    });



  }

  extending (data, params) {

    let requests = [];

    let w3w = this.w3w.reverse(this.formatInput(data, { provider: 'w3w' } ));
    let osm = this.osm.getRegions(this.formatInput(data, { provider: 'osm' } ));

    requests = [w3w,osm];

    return new Promise((resolve,reject) => {
      Promise.all(requests)
        .then(values => {
          resolve({
            w3w: this.formatOutputW3w(values[0]),
            rpath: this.formatOutputOsm(values[1])
          });

        })
        .catch(error => {
          reject(error);
        });
    });

  }

  formatInput (data, params) {
    switch (params.provider) {
      case 'w3w': return this.formatInputW3w(data, params);
      case 'osm': return this.formatInputOsm(data, params);
      case 'arcgis': return this.formatInputArcGIS(data, params);
    }
  }

  formatInputArcGIS (data, params) {

    if (params.method === 'reverse') {
      return `${data[0]},${data[1]}`;
    } else {
      if (_.isArray(data)) {
        return _.compact(data).join(',');
      }
      else return data.toString();
    }

  }

  formatInputW3w (data, params) {
    return { coords: `${data[1]},${data[0]}` };
  }

  formatInputOsm (data, params) {
    return {
      lat: data[1],
      lng: data[0],
      fields: 'osm_id'
    };
  }

  formatOutput (data, params) {
    switch(params.provider) {
      case 'w3w': return this.formatOutputW3w(data, params);
      case 'osm': return this.formatOutputOsm(data, params);
      case 'arcgis': return this.formatOutputArcGIS(data, params);
    }
  }

  formatOutputArcGIS (data, params) {

    if(params.method === 'reverse') {
      if(data.address) {
        return {
          properties: {
            address: data.address.Address,
            postal: data.address.Postal,
            city: data.address.City,
            country: data.address.CountryCode,
            formatted_name: data.address.Match_addr
          }
        };
      }

    } else if(params.method === 'geocode') {

      let location = _.first(data.locations);
      if (!location) return null;

      let geocode = location.feature;

      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [
            Number(geocode.geometry.x),  //  longitude
            Number(geocode.geometry.y)]  //  latitude
        },
        properties: {
          address: geocode.attributes.StAddr,
          postal: geocode.attributes.Postal,
          city: geocode.attributes.City,
          country: geocode.attributes.Country,
          formatted_name: geocode.attributes.Match_addr,
          house_number: geocode.attributes.AddNum,
          side: geocode.attributes.Side
        }
      };
    }
  }

  formatOutputOsm (data, params) {
    return data.map(region => {
      return Number(region.osm_id);
    });
  }

  formatOutputW3w (data, params) {
    return data;
  }

  generateGeoJson (data) {
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [
          data[0],        // longitude
          data[1]]        // latitude
      },
      properties: { }
    };
  }


};
