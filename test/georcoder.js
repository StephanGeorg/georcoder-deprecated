var should          = require('should'),
    Georcoder  = require('../lib/georcoder'),
    CLIENT_ID       = process.env.CLIENT_ID || null,
    CLIENT_SECRET   = process.env.CLIENT_SECRET || null,
    W3W_KEY         = process.env.W3W_KEY || null,
    TIMEOUT         = process.env.TEST_TIMEOUT || 5000;

describe('Georcoder', function(){


  console.log(CLIENT_ID,CLIENT_SECRET,W3W_KEY);

  var options = {
      w3w: {
        apiKey: W3W_KEY
      },
      osm: {},
      arcgis: {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET
      }
    };

  describe('Initializating', function() {

    it('with additional arguments', function() {
      geocoder = new Georcoder(options);
    });

  });


  describe('API responses without OAuth', function() {

    beforeEach(function(done){
      geocoder = new Georcoder(options);
      done();
    });



    it('should be able to reverse geocode', function(done) {
      this.timeout(TIMEOUT);
      geocoder.reverse([ 13.438096726000424, 52.49419352400048])
        .then(function(res) {
          res.should.be.json;
          console.log(res);
          done();
        })
        .catch(function(error){
          console.log(error);
        });
    });

    it('should be able to geocode', function(done) {
      this.timeout(TIMEOUT);
      geocoder.geocode('Glogauer Straße 5, 10999, Berlin, Germany')
        .then(function(res) {
          res.should.be.json;
          console.log(res);
          done();
        })
        .catch(function(error){
          console.log(error);
        });
    });





  });




});
