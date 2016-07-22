var should          = require('should'),
    Georcoder  = require('../lib/georcoder'),
    CLIENT_ID       = process.env.CLIENT_ID || null,
    CLIENT_SECRET   = process.env.CLIENT_SECRET || null,
    W3W_KEY         = process.env.W3W_KEY || null,
    TIMEOUT         = process.env.TEST_TIMEOUT || 5000;

describe('Georcoder', function(){


  console.log(CLIENT_ID,CLIENT_SECRET,W3W_KEY);

  var geocoder;
  var provider = [
    {
    type: 'geocoder-arcgis',
    params: {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,

    }
  }
  ];

  var extend = [
  {
    type: 'osm-regions',
    params: {}
  },
  {
    type: 'w3w-node-wrapper',
    params: {
      apiKey: W3W_KEY
    }
  }];

  describe('Initializating', function() {

    it('without any arguments', function() {
      (function() {
        geocoder = new Georcoder();
      }).should.not.throw();
    });

    it('with additional arguments', function() {

      geocoder = new Georcoder({
        provider: provider,
        extend: extend
      });

    });

  });


  describe('API responses without OAuth', function() {

    beforeEach(function(done){
      geocoder = new Georcoder({
        provider: provider,
        extend: extend
      });
      done();
    });



    it('should be able to reverse geocode', function(done) {
      this.timeout(TIMEOUT);
      geocoder.reverse('13.4482975,52.47432930000001')
        .then(function(res) {
          res.should.be.json;
          console.log(res);
          done();
        })
        .catch(function(error){
          console.log(error);
        });
    });

    it('should not be able to reverse geocode', function(done) {
      this.timeout(TIMEOUT);
      geocoder.reverse('11.1691,53.2700389')
        .then(function(res) {
          console.log(res);
          res.should.be.json;
          done();
        })
        .catch(function(error){
          //console.log(error);
          //res.should.be.json;
          //done();
        });
    });

    /*it('should be able to geocode', function(done) {
      this.timeout(TIMEOUT);
      geocoder.geocode('Berlin').then(function(res) {
        res.should.be.json;
        done();
      });
    });*/






  });




});
