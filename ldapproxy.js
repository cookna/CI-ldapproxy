/*************************************************************************************
* IBM Security Product Professional Services
* schmidtm@us.ibm.com
* nathan.a.cook@ibm.com
*
* A simple ldap proxy to the CIx webservices to provide the following operations
* over an LDA Protocol
* Simple Bind
* Simple Search (no wild cards, i.e. a person lookup)
* Simple User create using ldif
*
* April 2019
*
*/
'use strict'
const config = require('./dev.js');
const CIToken = require('./CIToken.js');
const ldap = require('ldapjs');
const request = require('request-promise-native');
const log = require('tracer').colorConsole({level: config.log});
const CIRequest = require('./CIRequest');
const CIFunctions = require('./CIFunctions');
// log levels are log - trace - debug - info - warn - error


// Variables we need:
var token = new CIToken();
var req = new CIRequest();
var CF = new CIFunctions();




// authenticate user
async function authUser(id, pwd) {
  log.debug('authUser(id,pwd) (%s,%s)',id,pwd);

  var body = {
    'username': id,
    'password': pwd
  }

  try {
    let url = '/v1.0/authnmethods/password/';
    return await req.post(url, body);
  } catch (e) {
    log.error('try catch is ', e);
    return null;
  }
}


// Define the ldap server functions and properties - last step is to kick it.
 function runLDAPServer() {
    log.debug('entry');
    var server = ldap.createServer();

    // Use this for debugging, remove later
    /**server.use(function(req, res, next) {
      log.log();
      log.log('USE req  = ', req);
      log.log('USE res  = ', res);
      return next();
    });*/


  server.bind(config.ldap.root, function(req, res, next) {
    log.debug('Bind');
    
    // get the user name and the password provided by the simple bind
    // note we need to cut out the user name, which is between the first
    // = and the first ,  uid=bob,xxx
    let id=req.dn.toString();
    id=id.substring(id.indexOf('=')+1);
    id=id.substring(0,id.indexOf(','));
    let pwd=req.credentials;
    log.trace('Login %s - %s', id, pwd);
    let status = CF.authUser(id, pwd).then( status => {
      if (status == null) {
        log.error('Failed authentication')
        return next(new ldap.InvalidCredentialsError());
      }
      res.end();
      return next();
    });
  });

  // the compare should not be need, included here as a place holder
  server.compare(config.ldap.root, function(req, res, next) {
    log.trace('===> DN: ', req.dn.toString());
    log.trace('===> attribute name: ', req.attribute);
    log.trace('===> attribute value: ', req.value);
    res.end(req.value === 'foo');
    return next();
  });

  // most of the work happens as part of searches, we will not enable all kinds
  // of searches but only the ones needed specifically for this implementation
  // this sample is tuned for searches done by ISAM using a federated registry
  // and basic user
  // we will use a combination of filter and dn to identify the response we need
  // to create.
  // NOTE that the config.ldap.root is case sensitive, so we use a lower case!
  server.search('ou=users, o=pps', function(req, res, next) {
    log.debug('entry');
    let filter=req.filter.toString();
    log.trace('search filter = ', filter);
    let dn=req.baseObject.toString();
    log.trace('search dn = ', dn);

    // We do not supconfig.ldap.port searches, these are really lookups
    // in other words, the username is either part of the filter,
    // or it is part of the DN
    if (filter=='(|(objectclass=eperson)(objectclass=person))') {
      var id = dn.substring(dn.indexOf('=')+1);
      id=id.substring(0,id.indexOf(','));
      log.trace('search id in dn = ', id);
    } else {
      var id = filter.substring(filter.indexOf('=')+1);
      id=id.substring(0,id.indexOf(')'));
      log.trace('search id in filter = ', id);
      //Parsing -b tag to see what container to search

        log.info("Searching users");
        //If id is empty or undefined return container with all users
        if(id == '*' || id == undefined) {
          log.info("String matchs users calling get all users");
  
          CF.getAllUsers().then( obj2 => {
            if(obj2 == null) {
              log.warn("Invalid return");
              res.end();
              return next();
            }
            //Iterate over list of users
            for(var i in obj2.Resources) {          
              var obj = CF.converttoLDAP(obj2.Resources[i].name.givenName, obj2.Resources[i], obj2.Resources[i]);   
              res.send(obj);       
            }
            log.info("Exiting User forloop");
            res.end();
            return next();
            });
        }
        //If id is defined search for specificed user
        else {
          CF.getUserbyName(id).then( status => {
            if (status == null) {
              log.warn('search with getUserbyName == null');
              res.end();
              return next();
            }
            CF.getUser(status.Resources[0].id).then( status2 => {
              if (status2 == null) {
                log.warn('search with getUser == null');
                res.end();
                return next();
              }
      
              var obj = CF.converttoLDAP(id, status.Resources[0], status2);
      
              res.send(obj);
              res.end();
              return next();
            });
          });
        }
      
      //Base search of all users and groups

  }
  });

server.search('ou=groups,o=pps', function(req, res, next) {
  log.debug('entry');
    let filter=req.filter.toString();
    log.trace('search filter = ', filter);
    let dn=req.baseObject.toString();
    log.trace('search dn = ', dn);

    // We do not supconfig.ldap.port searches, these are really lookups
    // in other words, the username is either part of the filter,
    // or it is part of the DN
    if (filter=='(|(objectclass=eperson)(objectclass=person))') {
      var id = dn.substring(dn.indexOf('=')+1);
      id=id.substring(0,id.indexOf(','));
      log.trace('search id in dn = ', id);
    } else {
      var id = filter.substring(filter.indexOf('=')+1);
      id=id.substring(0,id.indexOf(')'));
      log.trace('search id in filter = ', id);

    if(id == '*' || id == undefined) {
      log.info("Searching for Groups");
      CF.getAllGroups().then ( groups => {
        if(groups == null) {
          info.warn("No Groups Available");
          res.end();
          return next();   
        }
        log.info(groups);
      
        var resp = CF.convertGroupstoLDAP(groups);
        log.trace(resp);
        //Loop sends basic information about all groups i.e. name - created - last time modified
        resp.forEach(sd => {
          res.send(sd);
        })

        res.end();
      
      
    });
    log.info("Exiting groups search body");
    //res.end();
    return next();
    }
    else {
      //Searching for a specific group 
      CF.getAllGroups().then(async groups => {
        if(groups == null) {
          log.warn("Invalid return, no groups available");
          res.end();
          return next();
        }

        groups.Resources.forEach(async gp => {
          if(gp.displayName == id) {
            CF.getGroup(gp.id).then(async retObj => {
              if(retObj != undefined) {
                var ret = CF.convertGrouptoLDAP(retObj);
                res.send(ret);
                res.end();
                return next();
              }
            })
          }
        })
      })
     }
    }
});


// Search for the root base!
// We just return our root base.
// if the base search has a filter that looks for members, return nothing!
  server.search('', function(req, res, next) {
    log.debug('BASE search');
    let filter=req.filter.toString();
    log.trace('BASE search filter = ', filter);
    let dn=req.baseObject.toString();
    log.trace('BASE search dn = ', dn);

    // We do not supconfig.ldap.port searches for groups, so if the filter includes a
    // substring like member= we will return nothing.
    if (filter.indexOf('member=') > -1) {
      log.log('BASE SEARCH not allowed member filter');
      res.end();
      return next();
    }

    let obj = {
      dn: config.ldap.root,
      attributes: {
        objectclass: ['organization','top'],
        o: config.ldap.root.substring(config.ldap.root.indexOf('=')+1)
      }
    }

    res.send(obj);
    res.end();
    return next();
  });

  




  // An add example
  server.add(config.ldap.root, function(req, res, next) {
    log.debug('ADD entry');
    log.trace('DN: ' + req.dn.toString());
    log.trace('Entry attributes: ', req.toObject().attributes);
 
    CF.addUser(CF.convertfromLDAP(req.toObject().attributes)).then( r => {
      log.trace('add result is ',r);
      if (r==undefined) {
        return next(new ldap.UnwillingToPerformError());
      }
      if (r==409) {
        log.trace('Handling the 409')
        return next(new ldap.EntryAlreadyExistsError(req.dn.toString()));
      }
      res.end();      
      return next();
    })
  });

  // Kick the server
  server.listen(config.ldap.port, function() {
    console.log('%s : LDAP server listening at %s and using token %s', new Date().toLocaleString(), server.url, token.get());
  });
}

// Main Program
async function main() {
    log.info('start');
    // Initialize the token
    //token.init(config.tenant.ui,config.tenant.id,config.tenant.secret);
    CF.init(config);
    req.init(config);

    // Run the actual Server
    runLDAPServer();

    log.info('exit');
}

// Main Start
main();
