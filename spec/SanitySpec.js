describe("SanityTest", function() {
  var StaxPayments = require('../index.js');
  var sdk = new StaxPayments.StaxPaymentsClient(new StaxPayments.StaxApiCredentials('<your-stax-bearer-token>'));

  it("Should Exist", function() {
    expect(sdk).toBeDefined();
    expect(sdk.payments).toBeDefined();
    expect(sdk.terminals).toBeDefined();
  });

  it("Should Fetch Heatbeat", function(done) {
    sdk.setGatewayHost('https://api.blockchyp.com/');
    sdk.heartbeat()
      .then(function (response) {
        let hb = response.data
        expect(hb.success).toBe(true);
        expect(hb.timestamp).toBeDefined();
        expect(hb.latestTick).toBeDefined();
        done()
      })
      .catch(function (error) {
        console.log("Error:", error)
        done()
      })
  });

});
