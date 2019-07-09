/*************************************************************************************
* IBM Security Product Professional Services
* schmidtm@us.ibm.com
*
* A class that performs requests to the CI web services
*
* May 2019
*
*/
'use strict'
const request = require('request-promise-native');
const log = require('tracer').colorConsole({level:'info'});
const CIToken = require('./CIToken.js');
const NodeCache = require('node-cache');

var Crypto = require('crypto-js');
var AES = require('crypto-js/aes');
var SHA256 = require('crypto-js/sha224');

var CICache = new NodeCache();
var token = new CIToken();

module.exports = class CIRequest {
  constructor() {
  }

  /**
   * Method to create the connection object to be used here.
   * @param {*} conf
   */
  async init(conf) {
    log.debug('CIRequest.init()');
    this.config = conf;
    token.init(conf.tenant.ui,conf.tenant.id,conf.tenant.secret);
  }

  async get(url = '/') {
    log.debug('(url): ',url);
    var options;
    if((options = CICache.get(url)) != undefined) {
      log.info("Cache Hit");
      return options; 
    } else {

    options = {
      uri: this.config.tenant.ui+url,
      method: "GET",
      headers: { "authorization": "Bearer "+token.get() },
    }
  }
    var retValue = await request(options);
    CICache.set(url, retValue);
    return retValue;
  }

  async post(url = '/', Inbody) {
      log.debug('(url): ', url);
      
      
      options = {
          uri: this.config.tenant.ui+url+this.config.tenant.registry,
          method: "POST",
          json: true,
          headers: { "Accept": "application/json", "Content-Type": "application/json", "authorization": "Bearer "+token.get()},
          body: Inbody
    }
      return await request(options);;
  }
  //Authentication Post, implements encrypting username and password -> storing in cache to speed up 
  async authPost(url = '/', Inbody) {
    log.debug('(url): ', url);
      
      var encryptBody = Crypto.AES.encrypt(JSON.stringify(Inbody), 'secret key is 123').toString();
    
      var options;
      if((options = CICache.get(Inbody.username)) != undefined) {
        var bytes = Crypto.AES.decrypt(encryptBody.toString(), 'secret key is 123');
        var decrypt = JSON.parse(bytes.toString(Crypto.enc.Utf8));
        if(decrypt.username == Inbody.username && decrypt.password == Inbody.password) {
          log.info("POST Cache hit");
          return options; 
        }
      } else {
      
      options = {
          uri: this.config.tenant.ui+url+this.config.tenant.registry,
          method: "POST",
          json: true,
          headers: { "Accept": "application/json", "Content-Type": "application/json", "authorization": "Bearer "+token.get()},
          body: Inbody
      }
    }

      var retValue = await request(options);
      CICache.set(Inbody.username, encryptBody);
      return retValue;
  }


}

